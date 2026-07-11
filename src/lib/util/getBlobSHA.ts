
export default async function getBlobSHA(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  if (typeof crypto !== 'undefined') {
    // Use the Web Crypto API if available for better performance and security
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

    return Array.from(new Uint8Array(hashBuffer))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  } else if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    // Use Node.js crypto module if available
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(arrayBuffer));
    return hash.digest('hex');
  } else {
    throw new Error('No suitable hashing method available. Please ensure you are running in an environment that supports the Web Crypto API or Node.js crypto module.');
  }
}
