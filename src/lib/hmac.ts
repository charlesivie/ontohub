import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Validates the GitHub x-hub-signature-256 HMAC.
 * @param body - Raw request body as Buffer
 * @param signature - Value of the x-hub-signature-256 header (e.g. "sha256=abc123")
 * @param secret - Plaintext webhook secret
 */
export function verifyGithubSignature(
  body: Buffer,
  signature: string,
  secret: string
): boolean {
  if (!signature.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}
