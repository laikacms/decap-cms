import languageData from './data/languages.json';

const languageIdentifiers = languageData.flatMap(lang => lang.identifiers);

export default {
  properties: {
    default_language: { type: 'string', enum: languageIdentifiers },
    allow_language_selection: { type: 'boolean' },
    output_code_only: { type: 'boolean' },
    keys: {
      type: 'object',
      properties: {
        code: { type: 'string', minLength: 1 },
        lang: { type: 'string', minLength: 1 },
      },
      distinctProperties: ['code', 'lang'],
    },
  },
};
