import { afterEach, describe, expect, it } from 'vitest';

import loadScript from '@/lib/util/loadScript.js';

function getLastAppendedScript(): HTMLScriptElement {
  const scripts = document.head.getElementsByTagName('script');
  return scripts[scripts.length - 1];
}

describe('loadScript', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('appends a script tag to document.head with the given src', () => {
    loadScript('https://example.com/script.js');

    const script = getLastAppendedScript();
    expect(script).toBeDefined();
    expect(script.tagName).toBe('SCRIPT');
    expect(script.src).toBe('https://example.com/script.js');
    expect(script.parentElement).toBe(document.head);
  });

  it('resolves when the script fires onload', async () => {
    const promise = loadScript('https://example.com/ok.js');

    const script = getLastAppendedScript();
    expect(script.onload).toBeTypeOf('function');
    script.onload?.(new Event('load'));

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects with the error when the script fires onerror', async () => {
    const promise = loadScript('https://example.com/fail.js');

    const script = getLastAppendedScript();
    expect(script.onerror).toBeTypeOf('function');
    const error = new Event('error');
    script.onerror?.(error);

    await expect(promise).rejects.toBe(error);
  });

  it('appends a separate script tag for each call, even with the same src', () => {
    const before = document.head.getElementsByTagName('script').length;

    loadScript('https://example.com/dup.js');
    loadScript('https://example.com/dup.js');

    const after = document.head.getElementsByTagName('script').length;
    expect(after - before).toBe(2);
  });
});
