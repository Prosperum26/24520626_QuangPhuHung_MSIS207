/* ==========================================================================
   T-12-J1 – Scroll reveal
   Contract: Homework_1/TASK_DECOMPOSITION.md §6 T-12
   Marks elements that start below the fold as data-reveal="pending", flips
   them to "shown" when they scroll into view, then removes the attribute so
   later styles (hover transforms) are not held back by the reveal transition.
   The stagger itself is CSS (nth-child, see motion.css): this file never
   writes a delay or a style.
   Does nothing when the visitor prefers reduced motion or the browser has no
   IntersectionObserver: the content is then just visible.
   ========================================================================== */

const TARGETS = '.log-header, .log-body > .lede, .timeline-item, .skill-group, .contact-row, .project-card';

// Longer than the slowest reveal (--motion-slow 0.6s + the largest stagger, 5 x 90ms).
const DONE_AFTER_MS = 1500;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const supported = 'IntersectionObserver' in window;

const observer = supported
  ? new IntersectionObserver(onIntersect, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' })
  : null;

function onIntersect(entries) {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const element = entry.target;
    observer.unobserve(element);
    element.dataset.reveal = 'shown';
    // When the transition is over, drop the attribute and return to the normal styles.
    // A timer, not transitionend: that event also bubbles up from child elements.
    setTimeout(() => element.removeAttribute('data-reveal'), DONE_AFTER_MS);
  }
}

function watch(elements) {
  if (!supported || reduceMotion.matches) return;
  for (const element of elements) {
    // Already on screen at load: leave it alone, so nothing flashes in and out.
    if (element.getBoundingClientRect().top < window.innerHeight) continue;
    element.dataset.reveal = 'pending';
    observer.observe(element);
  }
}

watch(document.querySelectorAll(TARGETS));

// Project cards do not exist until the feed has loaded (js/project-feed.js).
document.addEventListener('projects:rendered', () => {
  watch(document.querySelectorAll('#project-list > .project-card'));
});
