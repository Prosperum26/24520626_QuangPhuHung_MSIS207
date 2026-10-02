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

## 7. Definition of Done (per sub-task)

- [ ] Matches the contract in `TASK_DECOMPOSITION.md` (names, ids, attributes, states).
- [ ] Renders correctly at 375px with no horizontal scroll.
- [ ] Fully usable with keyboard only (Tab / Shift+Tab / Enter / Space / Esc).
- [ ] Zero console errors.
- [ ] Lighthouse Accessibility has no new warnings.
- [ ] Repo grep is clean: no `var `, `innerHTML`, `onclick=`, `keyCode`, `keypress`, CDN URLs.
- [ ] Prompt link / screenshot recorded in the prompt log; AI mistakes noted for the failure audit.
- [ ] Committed atomically with the planned commit message.
