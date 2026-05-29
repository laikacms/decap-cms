import { Url } from './utilities';

export const url = (strings: TemplateStringsArray, ...values: any[]) => {
  const raw = strings.reduce((acc, str, i) => {
    if (i === values.length) return Url.join(acc, str);
    const segment = String(values[i]);

    return Url.combine(acc, str, segment);
  }, '');

  return raw;
};
