/* ==========================================================================
   Copy email — button[data-copy] writes its value to the clipboard and
   announces the result in the .toast live region for a few seconds.
   ========================================================================== */

import { t } from './i18n.js';

const TOAST_MS = 3000;

const toast = document.querySelector('.toast');
let hideTimer = 0;

const announce = (message) => {
  if (!toast) {
    return;
  }
  clearTimeout(hideTimer);
  toast.textContent = message;
  hideTimer = setTimeout(() => {
    toast.textContent = '';
  }, TOAST_MS);
};

document.querySelectorAll('button[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const value = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
      announce(t('toast.copied', `Copied ${value} to the clipboard.`).replace('{value}', value));
    } catch {
      announce(t('toast.failed', 'Could not copy. Select the address and copy it manually.'));
    }
  });
});
