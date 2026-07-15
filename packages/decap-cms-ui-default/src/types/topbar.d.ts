declare module 'topbar' {
  interface Topbar {
    show: () => void;
    hide: () => void;
    config: (options: Record<string, unknown>) => void;
  }

  const topbar: Topbar;
  export default topbar;
}
