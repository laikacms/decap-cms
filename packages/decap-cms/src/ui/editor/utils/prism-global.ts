// Forces Prism core to evaluate (and self-attach to `window.Prism`) before
// any module that transitively imports '@lexical/code'. Prism's component
// files (prism-clike, prism-javascript, ...) are classic scripts that extend
// a global `Prism`, while the core is CommonJS. In rolldown-based lib builds
// (our single-file demo bundles) the components get hoisted to eager
// top-level statements while the CJS core's require only runs inside the
// deferred lexical subgraph, so the components would run before the global
// exists and crash the whole bundle at load.
//
// The heavy lifting is the import itself: it must be the first import of the
// composition roots (app/extensions.ts, laika-app/extensions.ts) so this
// module's require of the core runs before the component statements. The
// exported function mostly exists so callers keep a used binding; this
// package ships `sideEffects` allowlisting only the entries, so a bare
// side-effect import of this module would be tree-shaken away.
import Prism from 'prismjs';

declare global {
  interface Window {
    // Must stay identical to the declaration in @lexical/code-prism's
    // FacadePrism.d.ts, or interface merging fails (TS2687/TS2717).
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- must match the upstream declaration verbatim
    Prism: typeof import('prismjs');
  }
}

export function ensurePrismGlobal() {
  if (typeof window !== 'undefined' && !window.Prism) {
    window.Prism = Prism;
  }
}
