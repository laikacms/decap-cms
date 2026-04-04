import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  // Polyfill global for packages like @iarna/toml
  (window as any).global = window;

  // Polyfill Buffer for packages like gray-matter
  (window as any).Buffer = Buffer;
}
