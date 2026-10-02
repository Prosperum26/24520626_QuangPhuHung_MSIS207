/* ==========================================================================
   Compile intro
   idle → typing → ready → compiling → done
   Types hung.tex, auto-compiles after a pause (or on Compile / Enter),
   prints a short pdflatex log, then morphs \name{…} into the <h1> with a
   View Transition. Skip / Esc jumps straight to the page.
   Plays once per session (sessionStorage 'intro-seen'); intro-gate.js has
   already decided whether to play at all.
   ========================================================================== */

const SOURCE = [
  ['cmd', '\\documentclass'], ['arg', '{portfolio}'], ['', '\n'],
  ['cmd', '\\usepackage'], ['arg', '{backend, ai, coffee}'], ['', '\n\n'],
  ['cmd', '\\begin'], ['arg', '{document}'], ['', '\n'],
  ['', '  '], ['cmd', '\\name'], ['', '{'], ['name', 'Quảng Phú Hưng'], ['', '}\n'],
  ['', '  '], ['cmd', '\\tagline'], ['arg', '{Backend & AI-oriented student}'], ['', '\n'],
  ['', '  '], ['cmd', '\\affiliation'], ['arg', '{UIT, VNU-HCM}'], ['', '\n'],
  ['', '  '], ['cmt', '% two teams led, four systems shipped'], ['', '\n'],
  ['', '  '], ['cmd', '\\maketitle'], ['', '\n'],
  ['cmd', '\\end'], ['arg', '{document}'],
];

const LOG = [
  'This is pdfTeX, Version 3.141592653 (portfolio edition)',
  '(./hung.tex [backend.sty] [ai.sty] [coffee.sty])',
  'Typesetting 5 sections, 4 figures, 1 table ...',
  'Output written on hung.pdf (1 page).',
];
const LOG_OK = '✓ Compiled in 0.42s';

const CHARS_PER_TICK = 2;
const TICK_MS = 16;
const AUTO_COMPILE_MS = 1400;
const LOG_LINE_MS = 170;
const SEEN_KEY = 'intro-seen';

const root = document.documentElement;
const intro = document.querySelector('.intro');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = () => {
  const code = intro.querySelector('.intro-source code');
  const log = intro.querySelector('.intro-log');
  const compileButton = intro.querySelector('.intro-compile');
  const skipButton = intro.querySelector('.intro-skip');
  const inertTargets = document.querySelectorAll('[data-intro-inert]');

  let state = 'idle';
  let autoTimer = 0;

  const setState = (next) => {
    state = next;
    intro.dataset.state = next;
  };

  const markSeen = () => {
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Storage blocked: the gate already treats that as "seen".
    }
  };

  inertTargets.forEach((el) => {
    el.inert = true;
  });

  const typeSource = async () => {
    setState('typing');
    for (const [kind, text] of SOURCE) {
      const span = document.createElement('span');
      if (kind) {
        span.className = `tok-${kind}`;
      }
      code.append(span);
      for (let i = 0; i < text.length; i += CHARS_PER_TICK) {
        if (state !== 'typing') {
          return;
        }
        span.textContent += text.slice(i, i + CHARS_PER_TICK);
        await sleep(TICK_MS);
      }
    }
  };

  // Fill in whatever is left instantly (Compile pressed mid-typing)
  const completeSource = () => {
    code.textContent = '';
    for (const [kind, text] of SOURCE) {
      const span = document.createElement('span');
      if (kind) {
        span.className = `tok-${kind}`;
      }
      span.textContent = text;
      code.append(span);
    }
  };

  const finish = async () => {
    if (state === 'done') {
      return;
    }
    setState('done');
    clearTimeout(autoTimer);
    document.removeEventListener('keydown', onKeydown);
    markSeen();

    const reveal = () => {
      root.classList.remove('intro-pending');
      inertTargets.forEach((el) => {
        el.inert = false;
      });
    };

    if (document.startViewTransition) {
      await document.startViewTransition(reveal).finished.catch(() => {});
    } else {
      reveal();
    }
    document.activeElement?.blur();
  };

  const compile = async () => {
    if (state === 'compiling' || state === 'done') {
      return;
    }
    if (state === 'typing') {
      completeSource();
    }
    clearTimeout(autoTimer);
    setState('compiling');

    for (const line of LOG) {
      const item = document.createElement('li');
      item.textContent = line;
      log.append(item);
      await sleep(LOG_LINE_MS);
      if (state !== 'compiling') {
        return;
      }
    }
    const ok = document.createElement('li');
    ok.className = 'log-ok';
    ok.textContent = LOG_OK;
    log.append(ok);
    await sleep(LOG_LINE_MS * 3);
    finish();
  };

  function onKeydown(event) {
    if (event.repeat) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      finish();
    } else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
      // A focused button already turns Enter into a click
      event.preventDefault();
      compile();
    }
  }

  compileButton.addEventListener('click', compile);
  skipButton.addEventListener('click', finish);
  document.addEventListener('keydown', onKeydown);
  compileButton.focus();

  typeSource().then(() => {
    if (state !== 'typing') {
      return;
    }
    setState('ready');
    autoTimer = setTimeout(compile, AUTO_COMPILE_MS);
  });
};

if (intro && root.classList.contains('intro-pending')) {
  run();
}
