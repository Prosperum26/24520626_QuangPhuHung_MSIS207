/* ==========================================================================
   swap(update) — run a DOM update inside a quick crossfade View Transition
   (html.vt-swap selects the short animation in source-mode.css).
   Falls back to a plain update without the API or with reduced motion.
   ========================================================================== */

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export const swap = (update) => {
  if (!document.startViewTransition || reducedMotion.matches) {
    update();
    return;
  }

  root.classList.add('vt-swap');
  const transition = document.startViewTransition(update);
  transition.finished.finally(() => root.classList.remove('vt-swap'));
};
