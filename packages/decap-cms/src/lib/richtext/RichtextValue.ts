import { detectMapper } from './detect';
import { getMapper } from './registry';

import type { PortableTextDocument } from './portable-text';

export interface RichtextValueOptions {
  /**
   * The field's `format` property: the desired output format and the
   * tie-breaker for input-format detection.
   */
  hint?: string | undefined;
  /**
   * Explicit output format. Defaults to `hint`, then to the detected input
   * format.
   */
  outputFormat?: string;
}

/**
 * A lazy rich-text value.
 *
 * This is the editor-agnostic object the richtext widget stores as its field
 * value. The expensive serialised string is produced only when `toString()` /
 * `toJSON()` is called — which the decap value-serializer pipeline does once,
 * at persist time — not on every keystroke.
 *
 * Flow on construction:
 *   `raw` (string) → detect mapper → Portable Text (held in `portableText`).
 *
 * The editor widget binds to this proxy, mirrors `portableText` to its native
 * model as the user types, and writes the canonical PT back via
 * {@link setPortableText} whenever the user changes the document.
 *
 * `toString()` reverses the flow: PT → the output mapper's string form.
 */
export class RichtextValue {
  /** The original stored string this value was created from. */
  readonly raw: string;
  /** Detected mapper id of `raw`. */
  readonly inputFormat: string;
  /** Mapper id used by `toString()`. Mutable: the user can change it. */
  outputFormat: string;
  /** Canonical Portable Text view; replaced by the editor as the user types. */
  portableText: PortableTextDocument;

  #serialized: string | null = null;
  #serializedFor: PortableTextDocument | null = null;
  #serializedForFormat: string | null = null;

  /**
   * While pristine, `toString()` returns `raw` verbatim instead of the mapper
   * output. Mappers normalise on export (e.g. markdown soft breaks become
   * two-space hard breaks), so an untouched field would otherwise serialise
   * to a string that differs byte-wise from what is stored — which makes
   * decap's dirty-check flag a freshly opened entry as "unsaved changes" and
   * makes every save rewrite content the user never edited (DCMS-471).
   * Editor mount echoes call {@link setPortableText} with a structurally
   * identical document; only a semantic change flips this off.
   */
  #pristine: boolean;
  #initialPortableTextJson: string | null = null;

  constructor(raw: string, options: RichtextValueOptions = {}) {
    this.raw = raw;
    this.inputFormat = detectMapper(raw, options.hint);
    this.outputFormat = options.outputFormat ?? options.hint ?? this.inputFormat;
    this.portableText = raw === '' ? [] : getMapper(this.inputFormat).toPortableText(raw);
    // `raw` only faithfully represents the value when it is already in the
    // output format; otherwise every serialisation must go through the mapper.
    this.#pristine = this.outputFormat === this.inputFormat;
  }

  /**
   * Editor subclasses whose echo passes through a normalising bridge (key
   * regeneration, span merging) must prime the baseline with the *bridged*
   * document so a mount echo compares equal. Without priming, the baseline
   * falls back to the construction-time Portable Text.
   */
  protected primePristineBaseline(json: string): void {
    if (this.#pristine) this.#initialPortableTextJson = json;
  }

  /** Replace the canonical PT view. Invalidates the memoised serialisation. */
  setPortableText(doc: PortableTextDocument): void {
    if (this.#pristine) {
      this.#initialPortableTextJson ??= JSON.stringify(this.portableText);
      if (JSON.stringify(doc) !== this.#initialPortableTextJson) {
        this.#pristine = false;
        this.#initialPortableTextJson = null;
      }
    }
    this.portableText = doc;
    this.#serialized = null;
  }

  /** Change the output format. Invalidates the memoised serialisation. */
  setOutputFormat(format: string): void {
    // `raw` is in the previous format, so it can no longer stand in for the
    // serialised value (even when switching back — the mapper output is now
    // the honest representation).
    if (format !== this.outputFormat) this.#pristine = false;
    this.outputFormat = format;
    this.#serialized = null;
  }

  /**
   * Serialize to the output format. While the value is semantically untouched
   * this returns the original `raw` string byte-for-byte; afterwards it is
   * computed lazily and memoised until the Portable Text or output format
   * changes.
   */
  toString(): string {
    if (this.#pristine) return this.raw;
    if (
      this.#serialized !== null
      && this.#serializedFor === this.portableText
      && this.#serializedForFormat === this.outputFormat
    ) {
      return this.#serialized;
    }
    const output = getMapper(this.outputFormat).fromPortableText(this.portableText);
    this.#serialized = output;
    this.#serializedFor = this.portableText;
    this.#serializedForFormat = this.outputFormat;
    return output;
  }

  /** `JSON.stringify` of an entry calls this; yields the serialised string. */
  toJSON(): string {
    return this.toString();
  }
}

/** Create a {@link RichtextValue} from a stored string. */
export function createRichtextValue(
  raw: string,
  options?: RichtextValueOptions,
): RichtextValue {
  return new RichtextValue(raw, options);
}
