/**
 * Generate S3-compatible presigned URL for R2 objects.
 * Uses HMAC-SHA256 signing (AWS Signature V4).
 *
 * Prerequisites:
 *   1. Create R2 API token: Cloudflare Dashboard → R2 → API Tokens
 *   2. Set secrets: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   3. Set vars in wrangler.toml: R2_ACCOUNT_ID, R2_BUCKET_NAME
 */

function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(input))
    .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
}

async function hmacSha256(key: Uint8Array, message: string): Promise<ArrayBuffer> {
  return crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(message));
}

export async function generateR2PresignedUrl(
  key: string, // e.g. "selfies/uuid.webp"
  accessKeyId: string,
  secretKey: string,
  accountId: string,
  bucket: string,
  expirySeconds = 3600,
): Promise<string> {
  const region = 'auto';
  const service = 's3';
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;

  const now = new Date();
  const amzDate = now.toISOString().slice(0, 19).replace(/[:-]/g, '') + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const queryString = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(accessKeyId + '/' + credentialScope)}&X-Amz-Date=${amzDate}&X-Amz-Expires=${expirySeconds}&X-Amz-SignedHeaders=host`;

  const canonicalRequest = `GET\n/${bucket}/${key}\n${queryString.replace(/&/g, '\n').replace(/=/g, '=')}\nhost:${accountId}.r2.cloudflarestorage.com\n\nhost\nUNSIGNED-PAYLOAD`;

  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmacSha256(new Uint8Array(kDate), region);
  const kService = await hmacSha256(new Uint8Array(kRegion), service);
  const kSigning = await hmacSha256(new Uint8Array(kService), 'aws4_request');
  const signature = Array.from(new Uint8Array(await hmacSha256(new Uint8Array(kSigning), stringToSign)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return `${endpoint}?${queryString}&X-Amz-Signature=${signature}`;
}
