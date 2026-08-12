/**
 * Unit tests for the client-side document tool validators.
 *
 * `getDocumentData` / `updateDocument` are the only two guards between an LLM
 * tool call and a JSON Patch (RFC 6902) applied directly to a CMS entry, so
 * their edge cases are pinned down explicitly here. The validators
 * (`isRecord`, `validateEmptyObject`, `isJsonPatchOperation`,
 * `validateUpdateDocumentInput`) aren't exported - they're exercised through
 * the `inputSchema.validate` callback each tool is built with.
 */

import { describe, expect, it } from 'vitest';

import { getDocumentData, updateDocument } from '@/ai/tools/document-tools';

// `inputSchema` is typed as `FlexibleSchema<INPUT>` on the public `Tool`
// type, which doesn't expose `validate` without narrowing. The tools are
// always built with `jsonSchema(..., { validate })`, so `validate` is always
// present at runtime - cast through `any` to reach it without depending on
// unexported SDK internals.
function validateWith(tool: typeof getDocumentData | typeof updateDocument, value: unknown) {
  const schema = tool.inputSchema as any;
  return schema.validate(value) as { success: true, value: unknown } | { success: false, error: Error };
}

describe('document-tools validators', () => {
  describe('getDocumentData.inputSchema (validateEmptyObject)', () => {
    it('accepts an empty object', () => {
      const result = validateWith(getDocumentData, {});
      expect(result.success).toBe(true);
    });

    it('rejects an object with keys', () => {
      const result = validateWith(getDocumentData, { foo: 'bar' });
      expect(result.success).toBe(false);
    });

    it('rejects arrays', () => {
      const result = validateWith(getDocumentData, []);
      expect(result.success).toBe(false);
    });

    it('rejects null', () => {
      const result = validateWith(getDocumentData, null);
      expect(result.success).toBe(false);
    });

    it('rejects non-object primitives', () => {
      expect(validateWith(getDocumentData, 'nope').success).toBe(false);
      expect(validateWith(getDocumentData, 42).success).toBe(false);
      expect(validateWith(getDocumentData, undefined).success).toBe(false);
    });
  });

  describe('updateDocument.inputSchema (validateUpdateDocumentInput / isJsonPatchOperation)', () => {
    it('accepts a single valid operation', () => {
      const result = validateWith(updateDocument, {
        operations: [{ op: 'replace', path: '/title', value: 'New Title' }],
      });
      expect(result.success).toBe(true);
    });

    it('accepts multiple valid operations', () => {
      const result = validateWith(updateDocument, {
        operations: [
          { op: 'replace', path: '/title', value: 'New Title' },
          { op: 'remove', path: '/deprecated_field' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('accepts an empty operations array (schema does not forbid it)', () => {
      const result = validateWith(updateDocument, { operations: [] });
      expect(result.success).toBe(true);
    });

    it.each(['add', 'remove', 'replace', 'move', 'copy', 'test'] as const)(
      'accepts the "%s" op',
      op => {
        const base = { op, path: '/foo' };
        const operation = op === 'move' || op === 'copy'
          ? { ...base, from: '/bar' }
          : { ...base, value: 'x' };
        const result = validateWith(updateDocument, { operations: [operation] });
        expect(result.success).toBe(true);
      },
    );

    it('accepts "from" on move/copy operations', () => {
      const result = validateWith(updateDocument, {
        operations: [{ op: 'move', path: '/new_path', from: '/old_path' }],
      });
      expect(result.success).toBe(true);
    });

    it('accepts "from" present on a non-move/non-copy operation (schema does not restrict which ops may carry it)', () => {
      const result = validateWith(updateDocument, {
        operations: [{ op: 'replace', path: '/title', value: 'x', from: '/other' }],
      });
      expect(result.success).toBe(true);
    });

    it('rejects an unknown op name', () => {
      const result = validateWith(updateDocument, {
        operations: [{ op: 'patch', path: '/title', value: 'x' }],
      });
      expect(result.success).toBe(false);
      expect((result as { success: false, error: Error }).error).toBeInstanceOf(Error);
    });

    it('rejects an operation missing "path"', () => {
      const result = validateWith(updateDocument, {
        operations: [{ op: 'replace', value: 'x' }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects an operation with an extra/unknown key', () => {
      const result = validateWith(updateDocument, {
        operations: [{ op: 'replace', path: '/title', value: 'x', unexpected: true }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects when "path" is not a string', () => {
      const result = validateWith(updateDocument, {
        operations: [{ op: 'replace', path: 123, value: 'x' }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects when "from" is present but not a string', () => {
      const result = validateWith(updateDocument, {
        operations: [{ op: 'move', path: '/new_path', from: 42 }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects a non-array "operations"', () => {
      const result = validateWith(updateDocument, { operations: { op: 'replace', path: '/title', value: 'x' } });
      expect(result.success).toBe(false);
    });

    it('rejects a payload missing "operations"', () => {
      const result = validateWith(updateDocument, {});
      expect(result.success).toBe(false);
    });

    it('rejects a payload with an extra top-level key', () => {
      const result = validateWith(updateDocument, {
        operations: [{ op: 'replace', path: '/title', value: 'x' }],
        extra: true,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-object top-level values', () => {
      expect(validateWith(updateDocument, null).success).toBe(false);
      expect(validateWith(updateDocument, []).success).toBe(false);
      expect(validateWith(updateDocument, 'nope').success).toBe(false);
    });

    it('rejects when an operations array element is not an object', () => {
      const result = validateWith(updateDocument, { operations: ['not-an-object'] });
      expect(result.success).toBe(false);
    });
  });
});
