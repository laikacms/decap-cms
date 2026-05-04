import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'yaml';
import uniq from 'lodash/uniq';

const rawDataPath = '../data/languages-raw.yml';
const outputPath = '../data/languages.json';
const loaderPath = '../src/languageLoaders.ts';

async function fetchData() {
  const filePath = path.resolve(__dirname, rawDataPath);
  const fileContent = await fs.readFile(filePath, 'utf-8');
  return yaml.parse(fileContent);
}

function outputData(data: unknown) {
  const filePath = path.resolve(__dirname, outputPath);
  return fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

interface LanguageData {
  label: string;
  extensions?: string[];
  aliases?: string[];
  codemirror_mode?: string | { name: string; [key: string]: unknown };
  codemirror_mime_type?: string;
}

interface TransformedLanguage {
  label: string;
  identifiers: string[];
  codemirror_mode: LanguageData['codemirror_mode'];
  codemirror_mime_type?: string;
}

function generateLoaders(transformedData: TransformedLanguage[]) {
  const modes = new Set<string>();
  transformedData.forEach(lang => {
    if (typeof lang.codemirror_mode === 'string') {
      modes.add(lang.codemirror_mode);
    } else if (lang.codemirror_mode && typeof lang.codemirror_mode === 'object') {
      modes.add(lang.codemirror_mode.name);
    }
  });

  let fileContent = `// Generated file - DO NOT EDIT
// This file contains dynamic loader functions for CodeMirror modes

const loaders: Record<string, () => Promise<unknown>> = {
`;

  Array.from(modes)
    .sort()
    .forEach(mode => {
      fileContent += `  '${mode}': () => import('codemirror/mode/${mode}/${mode}.js'),
`;
    });

  fileContent += `};

// Get a loader for a specific mode
export function getLanguageLoader(mode: string) {
  return loaders[mode] || null;
}

export default loaders;
`;

  const filePath = path.resolve(__dirname, loaderPath);
  return fs.writeFile(filePath, fileContent);
}

function transform(data: Record<string, LanguageData>) {
  return Object.entries(data).reduce((acc: TransformedLanguage[], [label, lang]) => {
    const { extensions = [], aliases = [], codemirror_mode, codemirror_mime_type } = lang;
    if (codemirror_mode) {
      const dotlessExtensions = extensions.map(ext => ext.slice(1));
      const identifiers = uniq(
        [label.toLowerCase(), ...aliases, ...dotlessExtensions].filter(alias => {
          if (!alias) {
            return;
          }
          return !/[^a-zA-Z]/.test(alias);
        }),
      );
      return [...acc, { label, identifiers, codemirror_mode, codemirror_mime_type }];
    }
    return acc;
  }, []);
}

async function process() {
  const data = await fetchData();
  const transformedData = transform(data);
  await outputData(transformedData);
  await generateLoaders(transformedData);

  console.log('Generated language data and loaders');
}

process();
