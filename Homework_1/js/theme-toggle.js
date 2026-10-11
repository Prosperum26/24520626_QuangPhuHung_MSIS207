/* ==========================================================================
   T-09-J2 – Theme toggle
   Contract: Homework_1/TASK_DECOMPOSITION.md §4.5 (#theme-toggle, key "theme")
   js/theme-init.js has already set <html data-theme> before paint. This file
   only keeps aria-pressed in step with it, flips it on click, and saves the
   choice. aria-pressed="true" means dark mode is on.
   ========================================================================== */

const KEY = 'theme';
const root = document.documentElement;
const button = document.querySelector('#theme-toggle');
const osDark = window.matchMedia('(prefers-color-scheme: dark)');

function readStored() {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === 'dark' || stored === 'light' ? stored : null;
  } catch {
    return null;
  }
}

function store(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
}

function currentTheme() {
  return root.dataset.theme === 'dark' ? 'dark' : 'light';
}

function apply(theme) {
  root.dataset.theme = theme;
  button.setAttribute('aria-pressed', String(theme === 'dark'));
}

apply(currentTheme());

button.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  apply(next);
  store(next);
});

// Follow the OS only while the visitor has not made a choice of their own.
osDark.addEventListener('change', (event) => {
  if (readStored() === null) {
    apply(event.matches ? 'dark' : 'light');
  }
});
