/* ==========================================================================
   Source / Compiled switch
   Toggles html.source-mode (styles in css/source-mode.css). Remembered for
   the session in sessionStorage 'view' = 'source' | 'compiled'; the class
   is re-applied before first paint by intro-gate.js.
   ========================================================================== */

import { swap } from './swap.js';

const STORAGE_KEY = 'view';
const CLASS_NAME = 'source-mode';

const root = document.documentElement;
const toggle = document.querySelector('#source-toggle');

const sync = () => {
  toggle.setAttribute('aria-pressed', String(root.classList.contains(CLASS_NAME)));
};

if (toggle) {
  sync();
  toggle.addEventListener('click', () => {
    // startViewTransition runs the update asynchronously, so save inside it
    swap(() => {
      const isSource = root.classList.toggle(CLASS_NAME);
      sync();
      try {
        sessionStorage.setItem(STORAGE_KEY, isSource ? 'source' : 'compiled');
      } catch {
        // Storage blocked: the mode lasts until reload.
      }
    });
  });
}
