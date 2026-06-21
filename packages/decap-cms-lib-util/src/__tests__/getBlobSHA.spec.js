import { sha256 } from 'js-sha256';

import getBlobSHA from '../getBlobSHA';

/**
 * Read a Blob as ArrayBuffer using FileReader (compatible with old jsdom).
 */
function blobToArrayBuffer(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = ({ target }) => resolve(target.result);
    fr.onerror = reject;
    fr.readAsArrayBuffer(blob);
  });
}

describe('getBlobSHA', () => {
  it('returns the correct SHA-256 hex digest for a known Blob', async () => {
    const blob = new Blob(['hello']);
    const arrayBuffer = await blobToArrayBuffer(blob);
    const expected = sha256(arrayBuffer);

    const result = await getBlobSHA(blob);

    expect(result).toBe(expected);
  });

  it('returns the SHA-256 of an empty ArrayBuffer for an empty Blob', async () => {
    const blob = new Blob([]);
    const arrayBuffer = await blobToArrayBuffer(blob);
    const expected = sha256(arrayBuffer);

    const result = await getBlobSHA(blob);

    expect(result).toBe(expected);
  });
});
