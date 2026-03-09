const crypto = require('crypto');

const SECRET = process.env.CHALLENGE_SECRET || 'fallback-dev-secret';

const PI_DIGITS = '14159265358979323846264338327950288419716939937510';

const regexChallenges = [
  {
    displayPattern: '/^[a-z]+\\d{2}$/',
    strings: ['bot42', 'Robot99', '12abc', 'hello07', 'BEEP11', 'zz00', 'a1', 'test88'],
    matches: [0, 3, 5, 7]
  },
  {
    displayPattern: '/\\b\\d{3}-\\d{4}\\b/',
    strings: ['555-1234', 'call me', '12-345', '800-0000', 'abc-defg', '999-9999', '55-12345', 'beep'],
    matches: [0, 3, 5]
  },
  {
    displayPattern: '/^(0|1)+$/',
    strings: ['101010', 'hello', '000111', '10102', '1', '0', 'binary', '11211'],
    matches: [0, 2, 4, 5]
  },
  {
    displayPattern: '/.*\\.(jpg|png|gif)$/',
    strings: ['photo.jpg', 'doc.pdf', 'meme.gif', 'icon.png', 'data.csv', 'pic.jpeg', 'art.gif', 'file.txt'],
    matches: [0, 2, 3, 6]
  }
];

function createToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function generateBinary() {
  const decimal = Math.floor(Math.random() * 200) + 56;
  const binary = decimal.toString(2).padStart(8, '0');
  return { type: 'binary', display: { binary }, answer: decimal };
}

function generateSlider() {
  const a = Math.floor(Math.random() * 9000) + 1000;
  const b = Math.floor(Math.random() * 9000) + 1000;
  return { type: 'slider', display: { a, b }, answer: a * b };
}

function generateEmojiGrid() {
  const items = ['🔌','🔋','⚙️','💾','🖥️','📡','🔧','🤖','💡','🔩','📱','🖨️','🌸','🐶','🌮','🎨'];
  const shuffled = [...items].sort(() => Math.random() - 0.5).slice(0, 12);
  const robotItems = ['🔌','🔋','⚙️','🤖','💾','🖥️','📡','🔧','🔩','📱','🖨️'];
  const answer = shuffled.reduce((acc, item, i) =>
    robotItems.includes(item) ? [...acc, i] : acc, []);
  return { type: 'grid', display: { grid: shuffled, subtype: 'emoji' }, answer };
}

function generateHex() {
  const r = Math.floor(Math.random() * 200) + 28;
  const g = Math.floor(Math.random() * 200) + 28;
  const b = Math.floor(Math.random() * 200) + 28;
  const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  return { type: 'hex', display: { hex }, answer: hex.toLowerCase() };
}

function generatePi() {
  const count = Math.floor(Math.random() * 11) + 10;
  const answer = PI_DIGITS.substring(0, count);
  return { type: 'pi', display: { count }, answer };
}

function generateRegex() {
  const challenge = regexChallenges[Math.floor(Math.random() * regexChallenges.length)];
  return {
    type: 'grid',
    display: { pattern: challenge.displayPattern, strings: challenge.strings, subtype: 'regex' },
    answer: challenge.matches
  };
}

const generators = [generateBinary, generateSlider, generateEmojiGrid, generateHex, generatePi, generateRegex];

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const gen = generators[Math.floor(Math.random() * generators.length)];
  const { type, display, answer } = gen();

  const token = createToken({ answer, type, ts: Date.now() });

  res.status(200).json({ type, display, token });
};
