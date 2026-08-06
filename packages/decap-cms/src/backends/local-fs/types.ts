// The parts of the File System Access API that are still Chromium-only and
// therefore missing from TypeScript's bundled `lib.dom.d.ts`:
// `window.showDirectoryPicker()` and the permission-query methods on
// `FileSystemHandle`. See https://developer.mozilla.org/docs/Web/API/File_System_API
//
// This module is deliberately side-effect free at runtime (types only); the
// backend feature-detects `window.showDirectoryPicker` before using any of
// this, so importing it doesn't imply the API is actually available.

export type FileSystemPermissionMode = 'read' | 'readwrite';

export interface FileSystemHandlePermissionDescriptor {
  mode?: FileSystemPermissionMode;
}

declare global {
  interface FileSystemHandle {
    queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  }

  interface DirectoryPickerOptions {
    id?: string;
    mode?: FileSystemPermissionMode;
    startIn?:
      | FileSystemHandle
      | 'desktop'
      | 'documents'
      | 'downloads'
      | 'music'
      | 'pictures'
      | 'videos';
  }

  interface Window {
    showDirectoryPicker?(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
  }
}
