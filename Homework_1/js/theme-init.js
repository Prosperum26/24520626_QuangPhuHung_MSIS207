/* ==========================================================================
   T-09-J1 – Theme init (stops the flash of the wrong theme)
   Contract: Homework_1/TASK_DECOMPOSITION.md §4.5 (localStorage key "theme")
   Loaded as a plain, blocking <script src> in <head>: it must run before the
   first paint. It is a file, not an inline script, so the CSP stays strict.
   Two jobs, both needed before anything is drawn:
   1. Set <html data-theme>. Without JS the CSS falls back to the OS setting
      through prefers-color-scheme (tokens.css).
   2. Add class "js" to <html>. The CSS uses it to draw the JS-only parts of
      the header (Menu button, theme switcher, collapsed menu) in their final
      state from the first paint, so the page does not jump when the module
      scripts run later. No JS means no class, and the header stays a plain
      list of links.
   ========================================================================== */

(function applyStoredTheme() {
  const KEY = 'theme';
  let theme = null;

  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'dark' || stored === 'light') {
      theme = stored;
    }
  } catch {
    // Storage blocked (private window, site data disabled): use the OS setting.
  }

  if (theme === null) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.add('js');
})();
