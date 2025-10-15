// Generate PBKDF2 derived keys for provided username and password (ESM)
// Usage: node scripts/gen-pbkdf2.js "Admin" "hbksfn1994" 210000

import crypto from 'node:crypto';

function toB64(buf) { return Buffer.from(buf).toString('base64'); }
function fromUtf8(s) { return Buffer.from(s, 'utf8'); }

const username = process.argv[2] || 'Admin';
const password = process.argv[3] || 'hbksfn1994';
const iterations = parseInt(process.argv[4] || '210000', 10);

const userSalt = crypto.randomBytes(16);
const passSalt = crypto.randomBytes(16);

const userDK = crypto.pbkdf2Sync(fromUtf8(username), userSalt, iterations, 32, 'sha256');
const passDK = crypto.pbkdf2Sync(fromUtf8(password), passSalt, iterations, 32, 'sha256');

console.log(JSON.stringify({
  iterations,
  user: { salt_b64: toB64(userSalt), dk_b64: toB64(userDK) },
  pass: { salt_b64: toB64(passSalt), dk_b64: toB64(passDK) }
}, null, 2));
