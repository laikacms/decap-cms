// Moved from packages/decap-cms/src/locales/en/index.ts (DCMS-1395 extraction).
// Registered additively onto the CMS's own phrases by registerAiTranslate().
const phrases = {
  editor: {
    editorControlPane: {
      i18n: {
        translateFromDefault: 'Translate from %{locale}',
        translatingFromDefault: 'Translating…',
        translateFromDefaultConfirm:
          'Do you want to fill in %{locale} using AI translation?\nAll existing content will be overwritten.',
        translateFromDefaultConfirmTitle: 'Translate from default locale',
        translateFailed: 'AI translation failed: %{error}',
      },
    },
  },
};

export default phrases;
