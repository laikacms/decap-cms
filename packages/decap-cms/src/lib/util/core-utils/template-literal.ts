import { Url } from './utilities';

export const url = (strings: TemplateStringsArray, ...values: any[]) => {
  const raw = strings.reduce((acc, str, i) => {
    if (i === values.length) return Url.join(acc, str);
    const segment = String(values[i]);

    return Url.combine(acc, str, segment);
  }, '');

  return raw;
};

function interpolate(strings: TemplateStringsArray, values: unknown[]) {
  return strings.reduce(
    (acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ''),
    '',
  );
}

export const oneLine = (strings: TemplateStringsArray, ...values: unknown[]) => {
  return interpolate(strings, values)
    .replace(/(?:\n\s*)+/g, ' ')
    .trim();
};

export const oneLineTrim = (strings: TemplateStringsArray, ...values: unknown[]) => {
  return interpolate(strings, values)
    .replace(/\n\s*/g, '')
    .trim();
};

export const stripIndent = (strings: TemplateStringsArray, ...values: unknown[]) => {
  const result = interpolate(strings, values);
  const lineIndents = result.match(/^[^\S\n]*(?=\S)/gm);
  const indent = lineIndents ? Math.min(...lineIndents.map(el => el.length)) : 0;
  if (indent) {
    return result.replace(new RegExp(`^[^\\S\\n]{${indent}}`, 'gm'), '').trim();
  }

  return result.trim();
};
