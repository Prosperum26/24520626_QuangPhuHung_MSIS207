/* ==========================================================================
   T-12-J2 – Magnetic buttons
   Contract: Homework_1/TASK_DECOMPOSITION.md §6 T-12
   While a mouse is over a .button it drifts a fraction of the way toward the
   pointer; on leave it glides back. The pull is written as two custom
   properties (--mag-x, --mag-y); motion.css turns them into a transform.
   Only for a real pointer (hover: hover + pointer: fine) and only when the
   visitor has not asked for reduced motion; keyboard focus is never affected.
   ========================================================================== */

const MAGNET = 0.3; // fraction of the pointer's offset from the button centre

const allowed = window.matchMedia('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)');

function pull(event) {
  const button = event.currentTarget;
  const box = button.getBoundingClientRect();
  const dx = event.clientX - (box.left + box.width / 2);
  const dy = event.clientY - (box.top + box.height / 2);
  button.style.setProperty('--mag-x', `${(dx * MAGNET).toFixed(1)}px`);
  button.style.setProperty('--mag-y', `${(dy * MAGNET).toFixed(1)}px`);
}

function release(event) {
  const button = event.currentTarget;
  button.style.removeProperty('--mag-x');
  button.style.removeProperty('--mag-y');
}

if (allowed.matches) {
  for (const button of document.querySelectorAll('.button')) {
    button.addEventListener('pointermove', pull);
    button.addEventListener('pointerleave', release);
  }
}
