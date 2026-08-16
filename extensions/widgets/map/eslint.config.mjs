import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import extensionConfig from '../../eslint.config.base.mjs';

// The plugins are resolved here, from this package's own node_modules, and
// injected: `extensions/` is not a package and cannot resolve them itself.
export default extensionConfig({
  configUrl: import.meta.url,
  eslint,
  tseslint,
  globals,
  prettierConfig,
});
