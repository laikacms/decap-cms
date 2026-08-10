/**
 * What a backend hands over as an entry's content.
 *
 * File-based backends read text and return {@link RawContent}; the engine
 * parses it with the collection's format. Backends whose storage is already
 * structured return {@link ParsedContent} and the engine passes the object
 * through by reference - no serialize-then-parse round trip.
 *
 * The union is open: future kinds (e.g. a `virtual` entry synthesized on
 * demand) can be added without touching producers. Consumers must switch
 * exhaustively so a new kind surfaces every affected site at compile time;
 * `assertNeverContent` is the default branch for that.
 */

/** Entry content as stored text, to be parsed with the collection's format. */
export type RawContent = {
  kind: 'raw',
  raw: string,
};

/** Entry content the backend already holds as structured fields. */
export type ParsedContent = {
  kind: 'parsed',
  data: Record<string, unknown>,
};

export type BackendEntryContent = RawContent | ParsedContent;

export function rawContent(raw: string): RawContent {
  return { kind: 'raw', raw };
}

export function parsedContent(data: Record<string, unknown>): ParsedContent {
  return { kind: 'parsed', data };
}

/**
 * Default branch of an exhaustive `switch (content.kind)`. Reached only when a
 * content kind was added without handling it here, which TypeScript reports at
 * the call site; at runtime it throws rather than silently doing nothing.
 */
export function assertNeverContent(content: never): never {
  throw new Error(
    `Unhandled entry content kind: ${(content as { kind?: unknown }).kind}`,
  );
}
