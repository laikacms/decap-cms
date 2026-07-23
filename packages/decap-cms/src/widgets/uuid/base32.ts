// Minimal RFC 4648 Base32 encoder (no padding), lowercased by the caller.
// Kept in-tree instead of pulling in a dependency for ~15 lines of bit-shifting.
const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Encodes a UUID (with or without dashes) as unpadded RFC 4648 Base32. */
export function uuidToBase32(uuid: string): string {
  const hex = uuid.replace(/-/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }

  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += RFC4648_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += RFC4648_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return output.toLowerCase();
}
