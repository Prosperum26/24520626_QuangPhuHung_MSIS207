/* ==========================================================================
   Project figures
   - .in-view on each .fig while it is on screen: diagrams animate only then
     (and the reward curve redraws each time it comes back into view).
   - button[data-dialog="id"] opens that <dialog> as a modal. Esc and the
     Close button are native; a click on the backdrop also closes it.
     Focus goes back to the button that opened it.
   ========================================================================== */

const figures = document.querySelectorAll('.fig');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (records) => {
      records.forEach(({ target, isIntersecting }) => {
        target.classList.toggle('in-view', isIntersecting);
      });
    },
    { threshold: 0.35 },
  );
  figures.forEach((fig) => observer.observe(fig));
} else {
  figures.forEach((fig) => fig.classList.add('in-view'));
}

document.querySelectorAll('button[data-dialog]').forEach((button) => {
  const dialog = document.getElementById(button.dataset.dialog);
  if (!(dialog instanceof HTMLDialogElement)) {
    return;
  }

  button.addEventListener('click', () => {
    dialog.showModal();
  });

  dialog.addEventListener('close', () => {
    button.focus();
  });

  // The dialog's own padding is also "the dialog", so compare against its box
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) {
      return;
    }
    const box = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= box.left && event.clientX <= box.right &&
      event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) {
      dialog.close();
    }
  });
});

// Open layers (dialog, footnote popover) sit in the top layer and would print
// over the page; close them so print.css can lay everything out inline.
window.addEventListener('beforeprint', () => {
  document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
  document.querySelectorAll('[popover]').forEach((popover) => {
    if (popover.matches(':popover-open')) {
      popover.hidePopover();
    }
  });
});
