const crypto = require('crypto');

const SECRET = process.env.CHALLENGE_SECRET || 'fallback-dev-secret';
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

function createToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch {
    return null;
  }
}

function isTokenExpired(payload) {
  return Date.now() - payload.ts > MAX_AGE_MS;
}

module.exports = { createToken, verifyToken, isTokenExpired };
