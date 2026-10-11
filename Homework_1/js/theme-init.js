/* ==========================================================================
   T-09-J1 – Theme init (stops the flash of the wrong theme)
   Contract: Homework_1/TASK_DECOMPOSITION.md §4.5 (localStorage key "theme")
   Loaded as a plain, blocking <script src> in <head>: it must run before the
   first paint. It is a file, not an inline script, so the CSP stays strict.
   The CSS reads [data-theme]; without JS it falls back to the OS setting
   through prefers-color-scheme (tokens.css).
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
})();
