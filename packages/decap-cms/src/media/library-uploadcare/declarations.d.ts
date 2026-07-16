declare module 'uploadcare-widget' {
  const uploadcare: {
    fileFrom(type: string, url: string): unknown,
    loadFileGroup(groupId: string): { done(cb: (group: unknown) => void): void },
    openDialog(
      files: unknown,
      config: Record<string, unknown>,
    ): {
      done(
        cb: (result: {
          promise: () => Promise<unknown>,
          files: (() => Promise<unknown>[]) | null,
        }) => void,
      ): void,
    },
    registerTab(name: string, tab: unknown): void,
  };
  export default uploadcare;
}

declare module 'uploadcare-widget-tab-effects' {
  const uploadcareTabEffects: unknown;
  export default uploadcareTabEffects;
}

interface Window {
  UPLOADCARE_LIVE: boolean;
  UPLOADCARE_MANUAL_START: boolean;
  UPLOADCARE_PUBLIC_KEY: string | undefined;
}
