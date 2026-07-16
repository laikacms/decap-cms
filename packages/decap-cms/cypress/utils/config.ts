import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse, stringify } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devTestDirectory = path.join(__dirname, '..', '..', 'dev-test');
const backendsDirectory = path.join(devTestDirectory, 'backends');

export async function copyBackendFiles(backend: string): Promise<void> {
  await Promise.all(
    ['config.yml', 'index.html'].map(file => {
      return fs.copyFile(
        path.join(backendsDirectory, backend, file),
        path.join(devTestDirectory, file),
      );
    }),
  );
}

export async function updateConfig(
  configModifier: (config: Record<string, unknown>) => void | Promise<void>,
): Promise<void> {
  const configFile = path.join(devTestDirectory, 'config.yml');
  const configContent = await fs.readFile(configFile, 'utf8');
  const config = parse(configContent) as Record<string, unknown>;
  await configModifier(config);
  await fs.writeFile(configFile, stringify(config));
}

export async function switchVersion(version: string): Promise<void> {
  const htmlFile = path.join(devTestDirectory, 'index.html');
  const content = await fs.readFile(htmlFile);

  const replaceString = version === 'latest'
    ? '<script src="dist/decap-cms.js"></script>'
    : `<script src="https://unpkg.com/decap-cms@${version}/dist/decap-cms.js"></script>`;

  await fs.writeFile(
    htmlFile,
    content.toString().replace(/<script src=".+?decap-cms.+?"><\/script>/, replaceString),
  );
}
