---
'@laikacms/decap-cms': minor
---

Deprecate the `ai-chat` widget. It was a client-side stopgap for AI-assisted editing of an open
entry, which the server-side laikacms MCP (`/mcp`) cannot reach because it has no access to the
editor's client-side draft state. The widget remains fully functional and its `ai`/`ai/*` server
adapter (also used by the AI-translate editor feature) is unchanged, but `DecapCmsWidgetAiChat.Widget()`
now logs a one-time deprecation warning on registration and the exports carry `@deprecated` JSDoc.
Prefer the MCP integration for AI-assisted editing; the widget will be removed once a client bridge
lets MCP edit an open entry.
