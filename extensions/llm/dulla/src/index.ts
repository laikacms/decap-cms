/**
 * Dulla — the Laika LLM transport for Decap CMS.
 *
 * Wordplay on the Dullahan, the headless rider: the piece that sits on top of a
 * headless CMS and does the talking. It implements the CMS's `LlmTransport`
 * against `@laikacms/server/ai`, so the chat panel and translate action the CMS
 * already ships get a working model without the CMS itself gaining an AI
 * dependency.
 *
 * Importing this module registers nothing. Pass the transport in
 * (`<DecapCmsProvider llm={createDullaTransport(...)}>`) or, for a compiled
 * bundle, call `registerDulla()`.
 */

export { createDullaTransport } from './dullaTransport';
export type { DullaTransportOptions } from './dullaTransport';
export { HIDDEN_METADATA_KEY } from './messages';
export { registerDulla } from './register';

export { registerDulla as default } from './register';
