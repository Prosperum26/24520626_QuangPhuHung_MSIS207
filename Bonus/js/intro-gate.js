/* ==========================================================================
   Intro gate — the only blocking script. It runs before first paint so the
   page never flashes the wrong state:
   - .js            scripts are running (shows the toolbar)
   - .intro-pending the compile intro will play (first visit this session,
                    motion allowed)
   - .source-mode   the visitor left source mode on earlier this session
   ========================================================================== */

(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const readSession = (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Blocked storage reads as "seen": without memory the intro would replay on every load.
  let introSeen = true;
  try {
    introSeen = sessionStorage.getItem('intro-seen') === '1';
  } catch {
    // keep introSeen = true
  }

  if (!reducedMotion && !introSeen) {
    root.classList.add('intro-pending');
  }

  if (readSession('view') === 'source') {
    root.classList.add('source-mode');
  }
})();
