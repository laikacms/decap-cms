// CSS imports with ?inline suffix (Vite convention - returns CSS as string)
declare module '*.css?inline' {
  const css: string;
  export default css;
}

// CSS imports (side-effect)
declare module '*.css' {
  const css: string;
  export default css;
}
