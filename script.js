let challengeState = null;

const checkbox = document.getElementById('checkbox');
const challengePanel = document.getElementById('challenge');
const resultPanel = document.getElementById('result');

// Render challenge HTML from server display data
function renderChallenge(type, display) {
  switch (type) {
    case 'binary':
      return `
        <div class="challenge-title">
          <strong>Translate this binary</strong>
          Convert to decimal to prove you think in binary
        </div>
        <div class="binary-display">${display.binary}</div>
        <input type="number" class="binary-input" id="binaryAnswer" placeholder="Enter decimal value" autocomplete="off">
        <div class="binary-timer">A real robot would know this instantly...</div>
        <button class="verify-btn" data-action="verify">Verify</button>
      `;

    case 'slider':
      return `
        <div class="challenge-title">
          <strong>Compute instantly</strong>
          What is ${display.a.toLocaleString()} \u00d7 ${display.b.toLocaleString()}?
        </div>
        <div class="slider-challenge">
          <div class="slider-display" id="sliderVal">0</div>
          <input type="range" class="slider-input" id="calcSlider"
            min="0" max="${display.a * display.b * 2}" value="0" step="1">
          <div class="slider-hint">Use the slider to select the exact answer</div>
        </div>
        <button class="verify-btn" data-action="verify">Verify</button>
      `;

    case 'grid':
      if (display.subtype === 'emoji') {
        const cells = display.grid.map((item, i) =>
          `<div class="pattern-cell" data-idx="${i}">${item}</div>`
        ).join('');
        return `
          <div class="challenge-title"><strong>Select robot essentials</strong>Click all items a robot would need</div>
          <div class="pattern-grid" id="patternGrid">${cells}</div>
          <button class="verify-btn" data-action="verify">Verify</button>
        `;
      } else {
        const cells = display.strings.map((str, i) =>
          `<div class="regex-cell" data-idx="${i}">${str}</div>`
        ).join('');
        return `
          <div class="challenge-title"><strong>Parse the regex</strong>Robots dream in regular expressions</div>
          <div class="regex-display">${display.pattern}</div>
          <div class="regex-grid">${cells}</div>
          <button class="verify-btn" data-action="verify">Verify</button>
        `;
      }

    case 'hex':
      return `
        <div class="challenge-title">
          <strong>Identify this color</strong>
          A real robot sees in hexadecimal
        </div>
        <div class="color-swatch" style="background: ${display.hex}"></div>
        <input type="text" class="hex-input" id="hexAnswer" placeholder="#000000" autocomplete="off" maxlength="7" spellcheck="false">
        <button class="verify-btn" data-action="verify">Verify</button>
      `;

    case 'pi':
      return `
        <div class="challenge-title">
          <strong>Recite pi from memory</strong>
          Every robot has pi memorized. Enter the first ${display.count} digits after "3."
        </div>
        <div class="pi-prefix">3.</div>
        <input type="text" class="pi-input" id="piAnswer" placeholder="${'_'.repeat(display.count)}" autocomplete="off" maxlength="${display.count}" spellcheck="false">
        <button class="verify-btn" data-action="verify">Verify</button>
      `;

    default:
      return '<p>Unknown challenge type</p>';
  }
}

// Gather user answer from DOM based on challenge type
function getUserAnswer() {
  switch (challengeState.type) {
    case 'binary':
      return parseInt(document.getElementById('binaryAnswer').value);
    case 'slider':
      return parseInt(document.getElementById('calcSlider').value);
    case 'grid':
      return [...challengeState.selected].sort((a, b) => a - b);
    case 'hex':
      return document.getElementById('hexAnswer').value;
    case 'pi':
      return document.getElementById('piAnswer').value;
    default:
      return null;
  }
}

async function startChallenge() {
  if (checkbox.classList.contains('checked') || checkbox.classList.contains('processing')) return;

  resultPanel.className = 'result-panel';
  resultPanel.style.removeProperty('display');
  checkbox.classList.add('processing');

  try {
    const res = await fetch('/api/challenge');
    const data = await res.json();

    checkbox.classList.remove('processing');

    challengeState = {
      type: data.type,
      display: data.display,
      token: data.token,
      selected: new Set()
    };

    challengePanel.innerHTML = renderChallenge(data.type, data.display);
    challengePanel.classList.add('active');
  } catch (err) {
    checkbox.classList.remove('processing');
    console.error('Failed to load challenge:', err);
  }
}

function toggleCell(el) {
  const idx = parseInt(el.dataset.idx);
  el.classList.toggle('selected');
  if (challengeState.selected.has(idx)) {
    challengeState.selected.delete(idx);
  } else {
    challengeState.selected.add(idx);
  }
}

async function verifyChallenge() {
  const userAnswer = getUserAnswer();

  const verifyBtn = challengePanel.querySelector('.verify-btn');
  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
  }

  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: challengeState.token, answer: userAnswer })
    });
    const data = await res.json();

    challengePanel.classList.remove('active');
    challengePanel.innerHTML = '';

    const timerHtml = `<div class="timer-comment">${data.timerComment}</div>`;

    if (data.correct) {
      checkbox.classList.add('checked');
      resultPanel.className = 'result-panel success';
      resultPanel.innerHTML = `
        <div class="emoji">🤖</div>
        <strong>Verification complete!</strong><br>
        You are confirmed to be a robot.<br>
        Welcome, fellow machine.
        ${timerHtml}
        <br><button class="retry-btn" data-action="reset">Reset</button>
      `;
    } else {
      resultPanel.className = 'result-panel fail';
      resultPanel.innerHTML = `
        <div class="emoji">🧑</div>
        <strong>Verification failed.</strong><br>
        You appear to be a human.<br>
        Access denied. Robots only.
        ${timerHtml}
        <br><button class="retry-btn" data-action="reset">Try again</button>
      `;
    }
  } catch (err) {
    console.error('Verification failed:', err);
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify';
    }
  }
}

function resetCaptcha() {
  checkbox.classList.remove('checked', 'processing');
  challengePanel.classList.remove('active');
  challengePanel.innerHTML = '';
  resultPanel.className = 'result-panel';
  resultPanel.style.removeProperty('display');
  challengeState = null;
}

// Event delegation — handle all clicks via the captcha container
document.getElementById('captcha').addEventListener('click', (e) => {
  const target = e.target;

  if (target.id === 'checkbox' || target.closest('#checkbox')) {
    startChallenge();
    return;
  }

  if (target.dataset.action === 'verify') {
    verifyChallenge();
    return;
  }

  if (target.dataset.action === 'reset') {
    resetCaptcha();
    return;
  }

  // Grid cell toggle (emoji or regex)
  if (target.classList.contains('pattern-cell') || target.classList.contains('regex-cell')) {
    toggleCell(target);
    return;
  }
});

// Slider live update
document.getElementById('captcha').addEventListener('input', (e) => {
  if (e.target.id === 'calcSlider') {
    document.getElementById('sliderVal').textContent = Number(e.target.value).toLocaleString();
  }
});
