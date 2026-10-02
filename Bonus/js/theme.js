/* ==========================================================================
   Theme — same contract as Exercises 2–4 (copied from Exercise_4/js/theme.js)
   - Persistence: localStorage key 'theme' = 'dark' | 'light' (nothing else)
   - Saved choice → force class on <html>; no choice → follow the OS via
     @media in tokens.css (no class), tracked here only for aria-pressed.
   ========================================================================== */

const STORAGE_KEY = 'theme';
const THEME_CLASSES = { dark: 'dark-theme', light: 'light-theme' };

const root = document.documentElement;
const toggle = document.querySelector('#theme-toggle');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

/* Storage can throw (private mode, blocked site data), so every access is
   guarded: the theme still works for this visit, just without persistence. */
const readSavedTheme = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return Object.hasOwn(THEME_CLASSES, value) ? value : null;
  } catch {
    return null;
  }
};

const saveTheme = (theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: keep the in-memory theme only.
  }
};

const getSystemTheme = () => (systemDark.matches ? 'dark' : 'light');

/* forced = true  → user choice, pin it with a class
   forced = false → OS choice, remove both classes and let @media decide */
const applyTheme = (theme, forced) => {
  root.classList.toggle(THEME_CLASSES.dark, forced && theme === 'dark');
  root.classList.toggle(THEME_CLASSES.light, forced && theme === 'light');

  if (toggle) {
    toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  }
};

// Initial state: saved choice wins, otherwise fall back to the OS setting.
const savedTheme = readSavedTheme();
let currentTheme = savedTheme ?? getSystemTheme();
applyTheme(currentTheme, savedTheme !== null);

// Native <button>: Enter and Space both fire "click", no key handling needed.
if (toggle) {
  toggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme, true);
    saveTheme(currentTheme);
  });
}

// Follow live OS changes only while the user has not picked a theme.
systemDark.addEventListener('change', () => {
  if (readSavedTheme() !== null) {
    return;
  }

  currentTheme = getSystemTheme();
  applyTheme(currentTheme, false);
});
