/* ==========================================================================
   T-10-J – Navigation toggle (disclosure, not a modal)
   Contract: Homework_1/TASK_DECOMPOSITION.md §4.5 (#nav-toggle, #nav-menu)
   On a phone the "Menu" button shows and hides the link list (nav.css reads
   the [data-open] attribute on the list). This is a
   disclosure: the menu is part of the page, so Tab moves through it and on
   out of it like any other content. There is deliberately NO focus trap.
   Ways to close it: the button, Escape (focus returns to the button), a
   click outside the header, picking a link, or tabbing out of the header.
   ========================================================================== */

const header = document.querySelector('.site-header');
const toggle = document.querySelector('#nav-toggle');
const menu = document.querySelector('#nav-menu');

function isOpen() {
  return toggle.getAttribute('aria-expanded') === 'true';
}

function setOpen(open) {
  toggle.setAttribute('aria-expanded', String(open));
  menu.toggleAttribute('data-open', open);
}

toggle.addEventListener('click', () => {
  setOpen(!isOpen());
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || event.repeat || !isOpen()) return;
  setOpen(false);
  toggle.focus();
});

document.addEventListener('click', (event) => {
  if (isOpen() && !header.contains(event.target)) {
    setOpen(false);
  }
});

// Following an in-page link: the section is now in view, so close the menu.
menu.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    setOpen(false);
  }
});

// Tabbing past the last item (or Shift+Tab back out) leaves the header: close the menu.
header.addEventListener('focusout', (event) => {
  if (isOpen() && event.relatedTarget && !header.contains(event.relatedTarget)) {
    setOpen(false);
  }
});
