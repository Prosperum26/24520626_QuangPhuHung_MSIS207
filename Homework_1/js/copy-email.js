/* ==========================================================================
   T-08-J – Copy email
   Contract: Homework_1/TASK_DECOMPOSITION.md §4.5 (ids), §6 T-08
   The address lives in one place: the mailto: link in index.html. This file
   reads it from there instead of repeating it.
   ========================================================================== */

const button = document.querySelector('#copy-email-btn');
const status = document.querySelector('#copy-status');
const mailLink = document.querySelector('#contact a[href^="mailto:"]');

const RESET_MS = 4000;
let resetTimer;

function report(message) {
  status.textContent = message;
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    status.textContent = '';
  }, RESET_MS);
}

button.addEventListener('click', async () => {
  const address = mailLink.getAttribute('href').replace('mailto:', '');
  try {
    await navigator.clipboard.writeText(address);
    report('Email address copied.');
  } catch {
    // Clipboard blocked (permissions, insecure context): tell the visitor how to do it by hand.
    report('Copy failed. Select the address above and copy it manually.');
  }
});
