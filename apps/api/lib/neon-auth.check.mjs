// Self-check: node lib/neon-auth.check.mjs  (signs a token locally and serves its JWKS from a fake fetch)
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyNeonAuthToken } from './neon-auth.mjs';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1' };
globalThis.fetch = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });

const mint = (claims, key = privateKey) => {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const body = `${enc({ alg: 'EdDSA', kid: 'k1' })}.${enc(claims)}`;
  return `${body}.${sign(null, Buffer.from(body), key).toString('base64url')}`;
};
const exp = Math.floor(Date.now() / 1000) + 60;

assert.equal((await verifyNeonAuthToken(mint({ email: 'a@b.c', exp }), 'https://x')).email, 'a@b.c');
await assert.rejects(verifyNeonAuthToken(mint({ email: 'a@b.c', exp: 1 }), 'https://x'), /expired/);
await assert.rejects(verifyNeonAuthToken(mint({ email: 'evil@b.c', exp }, generateKeyPairSync('ed25519').privateKey), 'https://x'), /signature/);
await assert.rejects(verifyNeonAuthToken('nope', 'https://x'), /Malformed/);
console.log('neon-auth verify: ok');
