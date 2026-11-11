import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createMcpServer } from '../mcp';

import type { AddressInfo } from 'node:net';

const TOKEN = 'dcp_' + 'a'.repeat(43);
const originalEnv = { ...process.env };
let turbo: http.Server | undefined;
let client: Client | undefined;

/** A stand-in Turbo instance: `/api/v1/me` reports an editor token, `/api/v1/orgs` one organization. */
async function fakeTurbo(): Promise<{ url: string, requests: string[] }> {
  const requests: string[] = [];
  turbo = http.createServer((req, res) => {
    requests.push(`${req.method} ${req.url} ${req.headers['x-decap-client']}`);
    const body = req.url === '/api/v1/me'
      ? { user: { email: 'x@example.com' }, organizations: [], token: { scope: 'editor' } }
      : [{ id: 'o1', name: 'Acme', role: 'owner', plan: 'free' }];
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  });
  await new Promise<void>(resolve => turbo!.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${(turbo.address() as AddressInfo).port}`, requests };
}

async function connect(apiUrl: string): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createMcpServer({ apiUrl }).connect(serverTransport);
  client = new Client({ name: 'test', version: '0' });
  await client.connect(clientTransport);
  return client;
}

beforeEach(() => {
  process.env.XDG_CONFIG_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'decap-mcp-'));
  delete process.env.DECAP_TOKEN;
  delete process.env.DECAP_API_URL;
});

afterEach(async () => {
  process.env = { ...originalEnv };
  await client?.close();
  client = undefined;
  if (turbo) await new Promise(resolve => turbo!.close(resolve));
  turbo = undefined;
});

describe('decap mcp', () => {
  it('lists every tool without a token, and asks to sign in when one is called', async () => {
    const mcp = await connect('http://127.0.0.1:9');
    const { tools } = await mcp.listTools();
    const names = tools.map(tool => tool.name);

    expect(names).toEqual(expect.arrayContaining(['whoami', 'list_orgs', 'create_site']));
    expect(tools.find(tool => tool.name === 'list_orgs')?.annotations).toMatchObject({ readOnlyHint: true });

    const result = await mcp.callTool({ name: 'list_orgs', arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: 'text', text: expect.stringContaining('Not signed in.') }]);
  });

  it('hides admin tools from an editor token and calls the API as the mcp client', async () => {
    process.env.DECAP_TOKEN = TOKEN;
    const { url, requests } = await fakeTurbo();
    const mcp = await connect(url);

    const names = (await mcp.listTools()).tools.map(tool => tool.name);
    expect(names).toContain('list_orgs');
    expect(names).not.toContain('create_site');

    const result = await mcp.callTool({ name: 'list_orgs', arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(JSON.parse((result.content as Array<{ text: string }>)[0]!.text)).toEqual([
      { id: 'o1', name: 'Acme', role: 'owner', plan: 'free' },
    ]);
    expect(requests).toEqual(['GET /api/v1/me mcp', 'GET /api/v1/orgs mcp']);
  });

  it('reports invalid arguments and unknown tools as tool errors', async () => {
    const mcp = await connect('http://127.0.0.1:9');

    const invalid = await mcp.callTool({ name: 'get_org', arguments: {} });
    expect(invalid.isError).toBe(true);
    expect(invalid.content).toEqual([{ type: 'text', text: expect.stringContaining('org_id') }]);

    const unknown = await mcp.callTool({ name: 'nope', arguments: {} });
    expect(unknown.content).toEqual([{ type: 'text', text: 'Unknown tool "nope".' }]);
  });
});
