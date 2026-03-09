const crypto = require('crypto');

const SECRET = process.env.CHALLENGE_SECRET || 'fallback-dev-secret';
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

  // Timing-safe comparison to prevent timing attacks
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

function checkAnswer(payload, userAnswer) {
  const { answer: correct, type } = payload;

  switch (type) {
    case 'binary':
    case 'slider':
      return parseInt(userAnswer) === correct;

    case 'hex':
      return typeof userAnswer === 'string' &&
        userAnswer.trim().toLowerCase() === correct;

    case 'pi':
      return typeof userAnswer === 'string' &&
        userAnswer.trim() === correct;

    case 'grid': {
      if (!Array.isArray(userAnswer)) return false;
      const sorted = [...userAnswer].sort((a, b) => a - b);
      const expected = [...correct].sort((a, b) => a - b);
      return sorted.length === expected.length &&
        sorted.every((v, i) => v === expected[i]);
    }

    default:
      return false;
  }
}

function getTimerComment(seconds, passed) {
  if (!passed) {
    return `Took ${seconds}s and still got it wrong. Definitely human.`;
  }
  if (seconds < 1) return `Solved in ${seconds}s. Blazing fast. Certified bot.`;
  if (seconds < 5) return `Solved in ${seconds}s. Acceptable, but a factory robot would be faster.`;
  if (seconds < 15) return `Solved in ${seconds}s. Suspiciously slow... are you running on vacuum tubes?`;
  if (seconds < 30) return `Solved in ${seconds}s. Even a human could almost solve it this fast.`;
  return `Solved in ${seconds}s. Processing time dangerously human-like.`;
}

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, answer } = req.body || {};

  if (!token || answer === undefined || answer === null) {
    return res.status(400).json({ error: 'Missing token or answer' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid or tampered token' });
  }

  // Reject expired challenges
  if (Date.now() - payload.ts > MAX_AGE_MS) {
    return res.status(400).json({ error: 'Challenge expired. Please try a new one.' });
  }

  const correct = checkAnswer(payload, answer);
  const elapsed = ((Date.now() - payload.ts) / 1000).toFixed(1);
  const timerComment = getTimerComment(elapsed, correct);

  res.status(200).json({ correct, elapsed, timerComment });
};
