/* ==========================================================================
   T-03-4J – Project Filter (+ T-03D-J dynamic cards)
   Contract: Exercise_3/TASK_DECOMPOSITION.md §3.6
             Exercise_4/TASK_DECOMPOSITION.md §3.7
   - Single source of truth: .project-grid[data-active-filter]
   - Valid filters come from the buttons in the DOM (no list in JS), so a new
     category only needs a new <button data-filter> + data-category in HTML.
   - Cards arrive later from project-feed.js, so they are queried on every
     render. The only link to that file is the "projects:rendered" event.
   - Everything lives inside one named function: classic scripts share one
     global scope, and theme.js already declares top-level consts.
   ========================================================================== */

const initProjectFilter = () => {
  const grid = document.querySelector('.project-grid');
  const filterBar = document.querySelector('.filter-bar');
  const status = document.querySelector('.filter-status');

  if (!grid || !filterBar || !status) {
    return;
  }

  const buttons = [...filterBar.querySelectorAll('.filter-button')];
  const validFilters = new Set(buttons.map((button) => button.dataset.filter));

  // Derive the whole view from the one state attribute.
  const render = () => {
    const active = grid.dataset.activeFilter;
    const items = [...grid.querySelectorAll(':scope > li')];
    let shown = 0;

    items.forEach((item) => {
      const card = item.querySelector('.project-card');
      const visible = active === 'all' || card?.dataset.category === active;

      // Hide the <li>, not the <article>: an empty <li> would keep its grid cell.
      item.hidden = !visible;
      if (visible) {
        shown += 1;
      }
    });

    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === active));
    });

    status.textContent = shown > 0
      ? `Showing ${shown} of ${items.length} projects`
      : 'No projects in this category yet.';
  };

  // One delegated listener; native <button> fires "click" for Enter and Space.
  filterBar.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-button');
    const next = button?.dataset.filter;

    if (!validFilters.has(next) || next === grid.dataset.activeFilter) {
      return;
    }

    grid.dataset.activeFilter = next;
    render();
  });

  // New cards (first load or Retry): re-apply the filter that is still
  // selected, since data-active-filter lives on the grid and survives.
  const section = grid.closest('#projects');
  section?.addEventListener('projects:rendered', render);

  // Unknown initial value in the HTML → fall back to "all", then sync the view.
  if (!validFilters.has(grid.dataset.activeFilter)) {
    grid.dataset.activeFilter = 'all';
  }
  render();
};

initProjectFilter();
