/* ==========================================================================
   T-03A-J + T-03B-J – Project Feed Controller (loading → success)
   Contract: Exercise_4/TASK_DECOMPOSITION.md §3.1 (state machine), §3.6
   - Single source of truth: #projects[data-state] ∈ STATES
   - setState() is the only writer of data-state and aria-busy; CSS reads them.
   - Pick a data source with ?demo=<key> (see DATA_SOURCES); no fake delays,
     the loading state is shown with DevTools network throttling.
   - Cards are cloned from #project-card-template and filled with textContent
     only, never parsed as HTML: the JSON is treated as untrusted input.
   - Talks to project-filter.js only through the "projects:rendered" event.
   - Everything lives inside one named function: classic scripts share one
     global scope, and theme.js already declares top-level consts.
   Not in this task: empty (T-03C-J1), error/retry (T-03C-J2).
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

  const section = document.querySelector('#projects');
  const grid = section?.querySelector('.project-grid');
  const template = document.querySelector('#project-card-template');

  if (!section || !grid || !template) {
    return;
  }

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

  /* Loading ---------------------------------------------------------------- */

  const load = async () => {
    setState('loading');

    const response = await fetch(getDataUrl(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const data = await response.json();
    const projects = Array.isArray(data?.projects) ? data.projects.filter(isValidProject) : [];

    // Empty (T-03C-J1) and error (T-03C-J2) branches come in later tasks.
    if (projects.length > 0) {
      render(projects);
    }
  };

  load();
};

initProjectFeed();
