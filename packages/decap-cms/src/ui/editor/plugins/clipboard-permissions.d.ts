// The W3C Permissions/Clipboard spec defines 'clipboard-read' and
// 'clipboard-write' as valid PermissionName values, but they are missing
// from this project's configured lib.dom.d.ts. PermissionName is a type
// alias, so it can't be extended via declaration merging directly; instead
// we add an overload to Permissions#query that accepts the wider set of
// names used by ContextMenuPlugin.tsx.
// https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query
type ClipboardPermissionName = 'clipboard-read' | 'clipboard-write';

interface Permissions {
  query(
    permissionDesc: { name: PermissionName | ClipboardPermissionName },
  ): Promise<PermissionStatus>;
}
