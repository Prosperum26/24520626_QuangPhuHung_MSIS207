/* ==========================================================================
   T-06-J – Project feed controller
   Contract: Homework_1/TASK_DECOMPOSITION.md §4.1, §4.2
   #projects[data-state] is the single source of truth: loading | success | error.
   JS only writes the attribute; CSS (project-card.css) shows and hides blocks.
   Loaded as a module (type="module"): deferred, and top-level names stay
   private to this file.
   ========================================================================== */

const DATA_URL = 'data/projects.json';
const TIMEOUT_MS = 8000;
const STATES = Object.freeze(['loading', 'success', 'error']);

const section = document.querySelector('#projects');
const title = document.querySelector('#projects-title');
const list = document.querySelector('#project-list');
const template = document.querySelector('#project-card-tpl');
const status = document.querySelector('.feed-status');
const errorMessage = document.querySelector('.feed-error-message');
const retryButton = document.querySelector('.feed-retry');

// Each load() bumps this; a response that arrives for an older request is dropped.
let requestId = 0;

/* The only place that writes data-state and aria-busy. */
function setState(next, message) {
  if (!STATES.includes(next)) {
    throw new Error(`Unknown feed state: ${next}`);
  }
  section.dataset.state = next;
  section.setAttribute('aria-busy', String(next === 'loading'));
  status.textContent = message;
}

/* Error kinds carry a name so the message can say what actually went wrong. */
class FeedError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidProject(project) {
  return (
    project !== null &&
    typeof project === 'object' &&
    ['id', 'index', 'title', 'period', 'category', 'summary'].every((key) => isNonEmptyString(project[key])) &&
    Array.isArray(project.stack) &&
    project.stack.length > 0 &&
    project.stack.every(isNonEmptyString) &&
    isHttpsUrl(project.repoUrl)
  );
}

async function fetchProjects(signal) {
  let response;
  try {
    response = await fetch(DATA_URL, { signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new FeedError('timeout', 'The projects took too long to load.');
    }
    throw new FeedError('network', 'The projects could not be reached. Check your connection.');
  }

  if (!response.ok) {
    throw new FeedError('http', `The server answered ${response.status} instead of the project list.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new FeedError('malformed', 'The project data is damaged and could not be read.');
  }

  const valid = Array.isArray(data?.projects) ? data.projects.filter(isValidProject) : [];
  if (valid.length === 0) {
    throw new FeedError('empty', 'The project list is empty or has no usable entries.');
  }
  return valid;
}

/* Cards are cloned from the <template> and filled with textContent, so no
   project text is ever parsed as HTML. */
function renderProjects(projects) {
  const cards = projects.map((project) => {
    const card = template.content.cloneNode(true);

    card.querySelector('.project-index').textContent = project.index;
    card.querySelector('.project-title').textContent = project.title;
    card.querySelector('.project-category').textContent = project.category;
    card.querySelector('.project-period').textContent = project.period;
    card.querySelector('.project-summary').textContent = project.summary;
    card.querySelector('.project-link-title').textContent = ` – ${project.title}`;
    card.querySelector('.project-link').href = project.repoUrl;

    const stack = card.querySelector('.project-stack');
    for (const tech of project.stack) {
      const badge = document.createElement('li');
      badge.className = 'badge';
      badge.textContent = tech;
      stack.append(badge);
    }
    return card;
  });
  list.replaceChildren(...cards);
}

async function load() {
  requestId += 1;
  const current = requestId;

  list.replaceChildren();
  setState('loading', 'Loading projects…');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const projects = await fetchProjects(controller.signal);
    if (current !== requestId) return;
    renderProjects(projects);
    setState('success', `${projects.length} projects loaded.`);
  } catch (error) {
    if (current !== requestId) return;
    const message = error instanceof FeedError ? error.message : 'Something went wrong while loading the projects.';
    // The alert already announces the message; an empty status avoids reading it twice.
    errorMessage.textContent = message;
    setState('error', '');
  } finally {
    clearTimeout(timer);
  }
}

retryButton.addEventListener('click', () => {
  // The Retry button is about to be hidden, so move focus somewhere that stays.
  title.focus();
  load();
});

load();
