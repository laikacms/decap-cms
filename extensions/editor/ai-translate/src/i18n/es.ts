// Moved from packages/decap-cms/src/locales/es/index.ts (DCMS-1395 extraction).
// Registered additively onto the CMS's own phrases by registerAiTranslate().
const phrases = {
  editor: {
    editorControlPane: {
      i18n: {
        translateFromDefault: 'Traducir desde %{locale}',
        translatingFromDefault: 'Traduciendo…',
        translateFromDefaultConfirm:
          '¿Quieres rellenar %{locale} usando una traducción por IA?\nSe sobrescribirá todo el contenido existente.',
        translateFromDefaultConfirmTitle: 'Traducir desde el idioma predeterminado',
      },
    },
  },
};

export default phrases;
