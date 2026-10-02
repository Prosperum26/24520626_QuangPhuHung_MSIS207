/* ==========================================================================
   EN / VI switch
   - English lives in the HTML and is read from the DOM once at startup;
     Vietnamese lives in i18n-vi.js. Missing VI keys fall back to English.
   - Text is always written with textContent / setAttribute, never parsed as HTML.
   - Persistence: localStorage key 'lang' = 'en' | 'vi'; first visit follows
     the browser language.
   ========================================================================== */

import { VI } from './i18n-vi.js';
import { swap } from './swap.js';

const STORAGE_KEY = 'lang';
const LANGS = ['en', 'vi'];

// data attribute → what it translates (null = the element's text)
const TARGETS = [
  ['data-i18n', null],
  ['data-i18n-label', 'aria-label'],
  ['data-i18n-alt', 'alt'],
  ['data-i18n-content', 'content'],
];

const root = document.documentElement;
const buttons = document.querySelectorAll('.lang-btn[data-lang]');

const entries = TARGETS.flatMap(([dataAttr, target]) =>
  Array.from(document.querySelectorAll(`[${dataAttr}]`), (el) => ({
    el,
    target,
    key: el.getAttribute(dataAttr),
    en: target ? el.getAttribute(target) : el.textContent,
  })),
);

let currentLang = 'en';

const readSavedLang = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return LANGS.includes(value) ? value : null;
  } catch {
    return null;
  }
};

const saveLang = (lang) => {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
};

/** Translate a key for scripts (toast messages etc.). */
export const t = (key, english) => (currentLang === 'vi' ? VI[key] ?? english : english);

const applyLang = (lang) => {
  currentLang = lang;
  for (const { el, target, key, en } of entries) {
    const value = lang === 'vi' ? VI[key] ?? en : en;
    if (target) {
      el.setAttribute(target, value);
    } else {
      el.textContent = value;
    }
  }
  root.lang = lang;
  buttons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
  });
};

const initialLang = readSavedLang() ?? (navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en');
if (initialLang !== 'en') {
  applyLang(initialLang);
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const lang = button.dataset.lang;
    if (lang === currentLang) {
      return;
    }
    swap(() => applyLang(lang));
    saveLang(lang);
  });
});
