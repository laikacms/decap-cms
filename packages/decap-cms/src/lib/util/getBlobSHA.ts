export default async function getBlobSHA(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  if (typeof crypto !== 'undefined') {
    // Use the Web Crypto API if available for better performance and security
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

    return Array.from(new Uint8Array(hashBuffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  } else {
    throw new Error(
      'No suitable hashing method available. Please ensure you are running in an environment that supports the Web Crypto API or Node.js crypto module.',
    );
  }
}
