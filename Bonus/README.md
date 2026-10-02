# Bonus — "Source → Compiled" portfolio

A portfolio that presents itself as a LaTeX paper. On the first visit of a session the
page types out its own `.tex` source, "compiles" it, and morphs into a typeset
document. Plain HTML, CSS and JavaScript only: no libraries, no build step, no CDN.

Serve with Live Server: `http://localhost:5500/Bonus/`.

## Features

| Feature | Where | Platform API |
|---|---|---|
| Compile intro (typing → log → morph) | `js/intro-gate.js`, `js/compile-intro.js`, `css/intro.css` | View Transitions, `inert`, `sessionStorage` |
| Source / Compiled switch | `js/source-toggle.js`, `css/source-mode.css` | CSS `content: attr()`, View Transitions (`js/swap.js`) |
| Paper layout: TOC, numbered sections, margin notes, footnotes | `css/base.css` | CSS counters, Popover API |
| Project figures + detail dialogs | `css/figures.css`, `js/figures.js` | inline SVG, `<dialog>`, IntersectionObserver |
| EN / VI | `js/i18n.js` (logic), `js/i18n-vi.js` (Vietnamese copy) | — |
| Theme | `js/theme.js` (same contract as Exercises 2–4) | `localStorage`, `matchMedia` |
| Copy email | `js/copy-email.js` | Clipboard API, `aria-live` |
| Reading progress | `css/base.css` | scroll-driven animations (progressive) |
| Print = CV | `css/print.css` | `@media print` |

## Contract

- `<html>` classes: `js` (scripts running), `intro-pending` (intro will play),
  `dark-theme` / `light-theme` (forced theme), `source-mode` (LaTeX source view).
- `localStorage`: `theme` = `'dark' | 'light'`, `lang` = `'en' | 'vi'`.
- `sessionStorage`: `intro-seen` = `'1'` once the intro has played or been skipped;
  `view` = `'source' | 'compiled'` for the Source switch.
- i18n: English copy lives in the HTML. Any element with `data-i18n="key"` gets its
  `textContent` replaced by `VI[key]`. `data-i18n-label`, `data-i18n-alt` and
  `data-i18n-content` do the same for `aria-label`, `alt` and `content`.
  The English text is read from the DOM at startup, so switching back needs no second dictionary.
- Intro: `[data-intro-inert]` elements are made `inert` while the overlay is shown.
- Figures: `button[data-dialog="<dialog id>"]` opens that `<dialog>`.
- Without JS the page is the fully readable, compiled English document.
