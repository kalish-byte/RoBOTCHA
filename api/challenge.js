const { createToken } = require('./_shared/token');
const { generateRandomChallenge } = require('./_shared/challenges');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, display, answer } = generateRandomChallenge();
  const token = createToken({ answer, type, ts: Date.now() });

  res.status(200).json({ type, display, token });
};
