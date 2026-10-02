# Project Rules – MSIS207 Lab 1

> Persistent context for every AI coding assistant used in this repo.
> **Mandate: Always parse `project-rules.md` before proposing any code changes.**
> If a request conflicts with these rules, stop and point out the conflict instead of silently breaking a rule.

---

## 1. Project Architectural Constraints

- Use Vanilla HTML5, modern CSS, and ES6+ JS exclusively.
- No jQuery, Bootstrap, Tailwind, or external script/style CDNs. No npm runtime dependencies.
- Prioritize native semantic HTML over generic `<div>` containers.
- Declare variables using `const` by default, `let` only if reassigned. Never `var`.
- Never render unescaped user input with `innerHTML` (XSS risk). Use `textContent` / `document.createElement`.
- Mobile-first: verify the 375px viewport before desktop.
- Always serve pages via Live Server (`http://localhost:5500`). Never open files via `file:///`.

---

## 2. AI Workflow Rules (Anti-Monolithic)

1. **One prompt = one sub-task.** Every request references a task ID from `TASK_DECOMPOSITION.md` (e.g. `T-01b`, `T-02A`). Do not solve tasks that were not asked for.
2. **Contract first.** Class names, ids, `data-*` attributes, localStorage keys and states are defined in `TASK_DECOMPOSITION.md`. Use them exactly; never rename or invent new ones without asking.
3. **Respect file scope.** Only touch the files listed in the prompt. An HTML task outputs HTML only; a CSS task outputs CSS only; a JS task outputs JS only.
4. **No hallucinated APIs or libraries.** Only use web platform APIs documented on MDN with "Baseline: Widely available" status unless the prompt says otherwise.
5. **Explain, don't just dump.** Each answer includes: the code, a short explanation per block, and how to verify it (DevTools step / grep command).
6. **Review mode.** When asked to "audit" or "review", list issues only — do not rewrite the code.
7. **Keep it editable.** Data and configuration (attribute names, key bindings, tokens, timestamps) live in one place, so a single constraint change during live defense needs a one-line edit.
8. **Slides teach syntax, not content.** Page copy must read like a real portfolio written for visitors. Never paste slide demo text (e.g. `H<sub>2</sub>O`, `2<sup>10</sup>`, slide quotes), lab requirements ("zero-div", "never uses innerHTML") or AI-workflow commentary into visible content. Use a semantic element only where the real content calls for it.

---

## 3. HTML Rules

- Boilerplate: `<!DOCTYPE html>`, `<html lang="en">`, `<meta charset="UTF-8">`, viewport meta. **No** `X-UA-Compatible`.
- Landmarks: skip-link (first focusable element) → `header` → `nav[aria-label]` → `main#main-content` → `section`s → `footer`.
- Exactly **one `<h1>`** per page; headings never skip levels (`h1 → h2 → h3`). Pick heading by structure, never by size.
- Emphasis: `<strong>` / `<em>`, not `<b>` / `<i>`. Removed text: `<del>` / `<s>`, never `<strike>`.
- Forbidden presentational markup: `<center>`, `<font>`, `border=`, `cellpadding=`, `align=`, inline `style=""`.
- Images: always `alt`, `width`, `height`; `loading="lazy"` for below-the-fold images (not the LCP image). Prefer `<picture>` with AVIF/WebP sources.
- Tables: `<caption>`, `<thead>`/`<tbody>`, `<th scope="col|row">`.
- Forms: every input has a visible `<label for="id">`; placeholders are not labels; hints linked via `aria-describedby`; use native validation (`required`, `type`, `minlength`, `pattern`).
- Every `href="#x"` must point to an existing `id="x"`.

---

## 4. CSS Rules

- External stylesheets only (`<link rel="stylesheet">`). No inline styles.
- Global reset: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }` and `html { color-scheme: light dark; }`.
- **Design tokens:** all colors are declared once as custom properties in `:root`. Rules use `var(--token)` only — **zero hardcoded hex/rgb values outside `:root`**.
- Dark mode: `@media (prefers-color-scheme: dark)` + a `.dark-theme` class override for the manual toggle.
- Layout: Flexbox for 1D (nav, toolbars), Grid for 2D (cards, galleries). Use `gap`, not margin hacks on children.
- Responsive grid: `repeat(auto-fit, minmax(280px, 1fr))`; zero horizontal scroll at 375px.
- Contrast ≥ 4.5:1 (WCAG 2.2 AA) in both themes. Visible `:focus-visible` styles; never `outline: none` without a replacement.
- Animations respect `@media (prefers-reduced-motion: reduce)`.

---

## 5. JavaScript Rules

- ES6+ modules or `defer`-ed scripts. No inline `<script>` blocks with logic, no inline handlers (`onclick=` etc.) — always `addEventListener`.
- DOM access: `querySelector` / `querySelectorAll`, `classList`, `dataset`.
- Keyboard: `keydown` + `event.key`. **Never** `keypress`, `keyCode`, or `which`. Throttle auto-repeat with `if (event.repeat) return;`.
- State: model states explicitly (e.g. `data-state="loading|success|empty|error"`), not with scattered boolean flags.
- Persistence: theme stored in localStorage key **`theme`** with values `'dark' | 'light'`. Fall back to `matchMedia('(prefers-color-scheme: dark)')` when unset.
- Async: `fetch` + `async/await` + `try/catch`; every failure path ends in a visible error state with an accessible retry `<button>`.
- Timers: compute remaining time from an absolute UTC ISO 8601 timestamp (`...Z`) on each tick — never decrement a counter. Always clear intervals.
- Forms: prevent double submit (disable the button while `submitting`).
- Update ARIA alongside state (`aria-pressed`, `aria-live`, `role="alert"`).

---

## 6. Git & Commit Rules

- Conventional commits: `type(scope): message` — types `docs`, `feat`, `fix`, `perf`, `refactor`, `style`, `chore`.
- **Atomic commits:** one sub-task per commit. Never mix HTML + CSS or CSS + JS in the same commit.
- No commit adding 100+ lines across multiple files without a matching spec in `TASK_DECOMPOSITION.md`.
- Spec first: the `docs(spec): ...` commit for an exercise comes before any code commit of that exercise.
- Do not commit `BRAINSTORM.md` or the lab PDF.

---

## 7. Slide Errata (do NOT copy these sample snippets verbatim)

The lab slides contain sample code that contradicts the rules above. When a slide and this file disagree, this file wins.

| Slide | Slide sample | Problem | Correct approach |
|---|---|---|---|
| 4 | Viewport "enforces 1:1 hardware pixel scaling" | `width=device-width` maps to **CSS pixels**, not device pixels (DPR ≠ 1) | Explain it as CSS-pixel layout viewport in the oral defense |
| 7 | Skip-link text `href="#main"` vs code `id="main-content"` | Broken anchor | Always `href="#main-content"` |
| 7 | `<header role="banner">`, `<nav role="navigation">`, `<main role="main">` | Redundant ARIA on native landmarks (validator warning) | Native elements only, no `role` |
| 9 | Hero/avatar `<img ... loading="lazy">` | Lazy-loading the above-the-fold LCP image delays LCP | No `loading="lazy"` on the LCP image; optionally `fetchpriority="high"` |
| 11 | "Only GET and POST exist natively" | `method="dialog"` also exists | — |
| 12 | `:has()` listed as "Newly available" | Widely available since mid-2026 | Check MDN Baseline before deciding |
| 14 | `<a href="#" aria-label="View State Engine repository">Source Code</a>` | Dead `href="#"`; `aria-label` does not contain visible text (WCAG 2.5.3 Label in Name) | Real URL; `aria-label` starts with the visible text, e.g. "Source code of State Engine on GitHub" |
| 17 / 19 | `.project-card` uses `var(--border-color)` | Token never declared in `theme.css` | Declare every token in `:root` (and dark overrides) |
| 18 | Skeleton gradient `#1e293b`, `#334155`; `animation: ... infinite` | Hardcoded hex outside `:root`; ignores reduced motion | Use tokens; disable shimmer in `prefers-reduced-motion: reduce`; `aria-busy="true"` on loading region |
| 19 + 22 | Dark mode only via `@media`; JS toggles `.dark-theme` | Toggle has no visible effect (no `.dark-theme` rule); saved theme never re-applied on load | Add `.dark-theme` (and light override) token block; read `localStorage.theme` → fallback `matchMedia` on load; set initial `aria-pressed` |
| 23 | ``querySelector(`.drum-pad[data-key="${key}"]`)`` with raw `e.key` | Keys like `"` or `\` throw `SyntaxError` (console error); `play()` promise rejection unhandled | `CSS.escape(key)` or a lookup map; `audio.play().catch(...)` |

---

## 8. Definition of Done (per sub-task)

- [ ] Matches the contract in `TASK_DECOMPOSITION.md` (names, ids, attributes, states).
- [ ] Renders correctly at 375px with no horizontal scroll.
- [ ] Fully usable with keyboard only (Tab / Shift+Tab / Enter / Space / Esc).
- [ ] Zero console errors.
- [ ] Lighthouse Accessibility has no new warnings.
- [ ] Repo grep is clean: no `var `, `innerHTML`, `onclick=`, `keyCode`, `keypress`, CDN URLs.
- [ ] Prompt link / screenshot recorded in the prompt log; AI mistakes noted for the failure audit.
- [ ] Committed atomically with the planned commit message.
