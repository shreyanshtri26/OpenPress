// Verifies a Neon Auth (Better Auth) JWT against the project's JWKS, with node:crypto only.
//   NEON_AUTH_BASE_URL   e.g. https://ep-xxx.neonauth.<region>.aws.neon.tech/neondb/auth
// The JWKS URL is <base>/.well-known/jwks.json. Trust comes from the signature checked against that fixed URL,
// so an attacker cannot mint a token for someone else's email.
import { createPublicKey, verify } from 'node:crypto';

const b64 = (s) => Buffer.from(s, 'base64url');
let cache = { keys: null, at: 0 };

async function jwks(baseUrl, force) {
  if (!force && cache.keys && Date.now() - cache.at < 10 * 60 * 1000) return cache.keys;
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/.well-known/jwks.json`);
  if (!res.ok) throw new Error(`Could not load Neon Auth keys (${res.status})`);
  cache = { keys: (await res.json()).keys || [], at: Date.now() };
  return cache.keys;
}

/** Returns the verified claims, or throws. */
export async function verifyNeonAuthToken(token, baseUrl) {
  const [h, p, s] = String(token || '').split('.');
  if (!h || !p || !s) throw new Error('Malformed token');
  const header = JSON.parse(b64(h).toString());
  const claims = JSON.parse(b64(p).toString());

  let key = (await jwks(baseUrl)).find((k) => k.kid === header.kid);
  if (!key) key = (await jwks(baseUrl, true)).find((k) => k.kid === header.kid); // rotated keys
  if (!key) throw new Error('Unknown signing key');

  const data = Buffer.from(`${h}.${p}`);
  const sig = b64(s);
  const publicKey = createPublicKey({ key, format: 'jwk' });
  const ok = header.alg === 'EdDSA' ? verify(null, data, publicKey, sig)
    : header.alg === 'ES256' ? verify('sha256', data, { key: publicKey, dsaEncoding: 'ieee-p1363' }, sig)
    : header.alg === 'RS256' ? verify('sha256', data, publicKey, sig)
    : false;
  if (!ok) throw new Error('Invalid token signature');
  if (!claims.exp || claims.exp * 1000 < Date.now()) throw new Error('Token expired');
  return claims;
}
