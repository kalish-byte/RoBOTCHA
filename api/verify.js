const { verifyToken, isTokenExpired } = require('./_shared/token');

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

  if (isTokenExpired(payload)) {
    return res.status(400).json({ error: 'Challenge expired. Please try a new one.' });
  }

  const correct = checkAnswer(payload, answer);
  const elapsed = ((Date.now() - payload.ts) / 1000).toFixed(1);
  const timerComment = getTimerComment(elapsed, correct);

  res.status(200).json({ correct, elapsed, timerComment });
};
