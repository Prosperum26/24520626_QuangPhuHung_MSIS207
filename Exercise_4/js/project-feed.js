/* ==========================================================================
   T-03A-J … T-03C-J2 – Project Feed Controller (4 states)
   Contract: Exercise_4/TASK_DECOMPOSITION.md §3.1 (state machine), §3.6
   - Single source of truth: #projects[data-state] ∈ STATES
   - setState() is the only writer of data-state and aria-busy; CSS reads them.
   - Pick a data source with ?demo=<key> (see DATA_SOURCES); no fake delays,
     the loading state is shown with DevTools network throttling.
   - Cards are cloned from #project-card-template and filled with textContent
     only, never parsed as HTML: the JSON is treated as untrusted input.
   - Talks to project-filter.js only through the "projects:rendered" event.
   - Errors are grouped into 4 kinds (timeout | network | http | format) and
     shown with a fixed, friendly message; the raw error text never reaches
     the page. Each load() gets a requestId so a late, stale response can't
     overwrite a newer state.
   - Everything lives inside one named function: classic scripts share one
     global scope, and theme.js already declares top-level consts.
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
  const ID_PATTERN = /^[a-z0-9-]+$/;
  const ERROR_MESSAGES = {
    timeout: () => 'Loading projects took too long.',
    network: () => "Couldn't reach the server. Check your connection.",
    http: (status) => `The project list is unavailable right now (error ${status}).`,
    format: () => "The project list couldn't be read.",
  };

  const section = document.querySelector('#projects');
  const grid = section?.querySelector('.project-grid');
  const template = document.querySelector('#project-card-template');
  const heading = section?.querySelector('#projects-title');
  const errorMessage = section?.querySelector('.feed-error-message');
  const retryButton = section?.querySelector('.feed-retry');

  if (!section || !grid || !template || !heading || !errorMessage || !retryButton) {
    return;
  }

  let currentRequest = 0;

  // Valid categories come from the filter buttons, so a card can never be
  // "orphaned" with a category that no button can show.
  const categories = new Set(
    [...section.querySelectorAll('.filter-button')]
      .map((button) => button.dataset.filter)
      .filter((filter) => filter !== 'all'),
  );

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

  /* Validation (§3.6) ------------------------------------------------------ */

  const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

  // Returns the URL object only for https: links; anything else (javascript:,
  // http:, relative, garbage) is dropped so it never reaches an href.
  const toSafeUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url : null;
    } catch {
      return null;
    }
  };

  const isValidProject = (project) =>
    project !== null &&
    typeof project === 'object' &&
    typeof project.id === 'string' &&
    ID_PATTERN.test(project.id) &&
    categories.has(project.category) &&
    isNonEmptyString(project.title) &&
    isNonEmptyString(project.categoryLabel) &&
    isNonEmptyString(project.description) &&
    Array.isArray(project.stack) &&
    project.stack.every(isNonEmptyString) &&
    Array.isArray(project.links);

  /* Rendering (T-03B-J) ---------------------------------------------------- */

  const createLink = (link, title) => {
    const url = toSafeUrl(link?.url);

    if (!url || !isNonEmptyString(link.label)) {
      return null;
    }

    const anchor = document.createElement('a');
    anchor.href = url.href;
    anchor.textContent = link.label;
    // Starts with the visible text: WCAG 2.5.3 Label in Name.
    const site = url.hostname === 'github.com' ? ' on GitHub' : '';
    anchor.setAttribute('aria-label', `${link.label} of ${title}${site}`);
    return anchor;
  };

  const createCard = (project) => {
    const item = template.content.firstElementChild.cloneNode(true);
    const card = item.querySelector('.project-card');
    const heading = card.querySelector('h3');
    const headingId = `project-${project.id}`;

    card.dataset.category = project.category;
    card.setAttribute('aria-labelledby', headingId);
    heading.id = headingId;
    heading.textContent = project.title;
    card.querySelector('.badge-category').textContent = project.categoryLabel;
    card.querySelector('.card-description').textContent = project.description;

    const stackList = card.querySelector('.badge-list');
    project.stack.forEach((tech) => {
      const badge = document.createElement('li');
      badge.className = 'badge';
      badge.textContent = tech;
      stackList.append(badge);
    });

    const footer = card.querySelector('.card-footer');
    project.links
      .map((link) => createLink(link, project.title))
      .filter(Boolean)
      .forEach((anchor) => footer.append(anchor));

    return item;
  };

  const render = (projects) => {
    const fragment = document.createDocumentFragment();
    projects.forEach((project) => fragment.append(createCard(project)));

    // One DOM write; also clears cards from an earlier load.
    grid.replaceChildren(fragment);
    setState('success');
    section.dispatchEvent(new CustomEvent('projects:rendered'));
  };

  /* Errors (T-03C-J2) ----------------------------------------------------- */

  // An Error tagged with one of the 4 kinds above.
  const feedError = (kind, status) => Object.assign(new Error(kind), { kind, status });

  const toKind = (error) => {
    if (error.kind) {
      return error.kind;
    }
    if (error.name === 'TimeoutError') {
      return 'timeout';
    }
    // fetch() rejects with TypeError when the request never got a response.
    if (error instanceof TypeError) {
      return 'network';
    }
    return 'format';
  };

  // Prefer AbortSignal.timeout(); fall back to AbortController + timer.
  // The signal also covers reading the body, so call clear() after json().
  const createTimeout = () => {
    if (typeof AbortSignal.timeout === 'function') {
      return { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), clear: () => {} };
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
      FETCH_TIMEOUT_MS,
    );
    return { signal: controller.signal, clear: () => clearTimeout(timer) };
  };

  const readJson = async (response) => {
    try {
      return await response.json();
    } catch (error) {
      // Bad syntax is a data problem; a timeout while reading stays a timeout.
      throw error.name === 'SyntaxError' ? feedError('format') : error;
    }
  };

  /* Loading ---------------------------------------------------------------- */

  const load = async () => {
    currentRequest += 1;
    const requestId = currentRequest;
    const isStale = () => requestId !== currentRequest;
    const timeout = createTimeout();

    setState('loading');
    errorMessage.textContent = '';

    try {
      const response = await fetch(getDataUrl(), { signal: timeout.signal });

      if (!response.ok) {
        throw feedError('http', response.status);
      }

      const data = await readJson(response);

      if (isStale()) {
        return;
      }

      if (!Array.isArray(data?.projects)) {
        throw feedError('format');
      }

      // T-03C-J1: a valid, empty list is not an error.
      if (data.projects.length === 0) {
        setState('empty');
        return;
      }

      const projects = data.projects.filter(isValidProject);

      if (projects.length === 0) {
        throw feedError('format');
      }

      render(projects);
    } catch (error) {
      if (isStale()) {
        return;
      }

      const kind = toKind(error);
      setState('error');
      // Written after the panel is shown, so role="alert" announces it.
      errorMessage.textContent = `${ERROR_MESSAGES[kind](error.status)} Try again, or see my work on GitHub.`;
    } finally {
      timeout.clear();
    }
  };

  // Retry only from "error". The button disappears in "loading", so move
  // focus to the section heading instead of letting it fall to <body>.
  retryButton.addEventListener('click', () => {
    if (section.dataset.state !== 'error') {
      return;
    }

    setState('loading');
    heading.focus();
    load();
  });

  load();
};

initProjectFeed();
