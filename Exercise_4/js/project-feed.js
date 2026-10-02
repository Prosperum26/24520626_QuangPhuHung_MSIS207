/* ==========================================================================
   T-03A-J – Project Feed Controller (loading state)
   Contract: Exercise_4/TASK_DECOMPOSITION.md §3.1 (state machine), §3.6
   - Single source of truth: #projects[data-state] ∈ STATES
   - setState() is the only writer of data-state and aria-busy; CSS reads them.
   - Pick a data source with ?demo=<key> (see DATA_SOURCES); no fake delays,
     the loading state is shown with DevTools network throttling.
   - Everything lives inside one named function: classic scripts share one
     global scope, and theme.js already declares top-level consts.
   Not in this task: rendering (T-03B-J), empty (T-03C-J1), error/retry (T-03C-J2).
   ========================================================================== */

const initProjectFeed = () => {
  const STATES = ['loading', 'success', 'empty', 'error'];
  const DATA_SOURCES = {
    default: 'data/projects.json',
    empty: 'data/projects-empty.json',
    malformed: 'data/projects-malformed.json',
    error: 'data/does-not-exist.json', // real 404 from Live Server
  };
  const FETCH_TIMEOUT_MS = 8000;

  const section = document.querySelector('#projects');

  if (!section) {
    return;
  }

  // Only place that writes state. Unknown values are rejected, not stored.
  const setState = (next) => {
    if (!STATES.includes(next)) {
      return;
    }

    section.dataset.state = next;
    section.setAttribute('aria-busy', String(next === 'loading'));
  };

  // Unknown or missing ?demo= value → the real project list.
  const getDataUrl = () => {
    const demo = new URLSearchParams(window.location.search).get('demo');
    return Object.hasOwn(DATA_SOURCES, demo) ? DATA_SOURCES[demo] : DATA_SOURCES.default;
  };

  const load = async () => {
    setState('loading');

    const response = await fetch(getDataUrl(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    // Branching on the result (success / empty / error) comes in later tasks.
    return response.json();
  };

  load();
};

initProjectFeed();
