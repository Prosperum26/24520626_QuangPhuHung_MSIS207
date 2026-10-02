# TASK_DECOMPOSITION – Exercise 2: Enterprise Developer Portfolio Decomposition Pipeline

> Work Breakdown Structure (WBS) cho Exercise 2.
> Tài liệu này được viết và commit **trước** khi prompt AI sinh code (`docs(spec)` đi trước mọi commit code).
> Mọi prompt AI đều tham chiếu đúng **1** task ID dưới đây và đính kèm `project-rules.md` + phần contract liên quan.

---

## 1. Mục tiêu bài

Nâng trang portfolio semantic của Exercise 1 thành một trang **có design system, responsive và có dark mode**, theo đúng 3 sub-task bắt buộc:

| ID | Sub-task bắt buộc | Commit bắt buộc |
|---|---|---|
| T-02A | Tokens & Reset | `feat(css): tokens & reset` |
| T-02B | 2D Grid Layout | `feat(css): responsive grid` |
| T-02C | Theme Engine | `feat(js): dark mode engine` |

**Contract-first constraints (bất biến):**

- Trạng thái theme lưu **duy nhất** qua localStorage key `'theme'`.
- Màu luôn đi theo cặp qua CSS variables; **0 mã hex/rgb hardcode trong rule** (chỉ được xuất hiện trong khối khai báo token).
- Performance budget: **CLS = 0**, **LCP < 2.0s** trên DevTools *Fast 3G*.

**Ngoài phạm vi:** form liên hệ, fetch dữ liệu, animation phức tạp, ảnh project (để Exercise 3+).

---

## 2. Quy trình 4 bước áp dụng

| Bước | Áp dụng trong bài |
|---|---|
| 1. Functional Slicing | Tách thành T-02-0 (HTML hook) → T-02A (CSS tokens) → T-02B (CSS layout) → T-02C (JS) → T-02D (audit). Mỗi task chỉ chạm **1 loại file** |
| 2. Contract Definition | Chốt trước tên file, token, class, id, key localStorage, state machine (mục 3) |
| 3. Atomic Generation | 1 prompt = 1 task ID, chỉ đính kèm file trong phạm vi task đó |
| 4. Contract Verification | Mỗi task có cổng kiểm tra riêng (mục 5); pass mới commit và sang task tiếp |

---

## 3. Contract (chốt trước khi viết code)

### 3.1 Cấu trúc file & thứ tự nạp

```
Exercise_2/
├── index.html          ← T-02-0 (chỉ HTML)
├── css/
│   ├── tokens.css      ← T-02A: token + reset + typography cơ bản
│   └── layout.css      ← T-02B: flex/grid, responsive, component layout
└── js/
    └── theme.js        ← T-02C: theme engine
```

Thứ tự trong `<head>`:

```html
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/layout.css">
<script src="js/theme.js" defer></script>
```

- `tokens.css` nạp trước để mọi `var(--*)` trong `layout.css` đều đã được khai báo.
- Script dùng `defer` (đúng `project-rules.md` §5) → không chặn render, không làm chậm LCP.

### 3.2 Design tokens (2 tầng)

**Tầng 1 – Primitive (nơi DUY NHẤT có mã hex, nằm trong `:root` của `tokens.css`):**

| Token | Giá trị |
|---|---|
| `--palette-slate-50` | `#f1f5f9` |
| `--palette-slate-300` | `#cbd5e1` |
| `--palette-slate-500` | `#64748b` |
| `--palette-slate-600` | `#475569` |
| `--palette-slate-800` | `#1e293b` |
| `--palette-slate-900` | `#0f172a` |
| `--palette-white` | `#ffffff` |
| `--palette-blue-300` | `#93c5fd` |
| `--palette-blue-700` | `#1d4ed8` |

**Tầng 2 – Semantic (rule chỉ được dùng tầng này, map sang primitive bằng `var()`):**

| Semantic token | Light | Dark | Dùng cho |
|---|---|---|---|
| `--color-bg` | white | slate-900 | nền trang |
| `--color-surface` | slate-50 | slate-800 | card, header, nav |
| `--color-text` | slate-900 | slate-50 | chữ chính |
| `--color-text-muted` | slate-600 | slate-300 | mô tả, footer |
| `--color-accent` | blue-700 | blue-300 | link, viền focus, nút |
| `--color-on-accent` | white | slate-900 | chữ đặt trên nền accent |
| `--color-border` | slate-500 | slate-500 | viền card (trang trí) |
| `--color-focus` | blue-700 | blue-300 | `:focus-visible` outline |

**Token không phải màu** (cũng chỉ khai báo trong `:root`):

| Nhóm | Token |
|---|---|
| Spacing | `--space-1` 0.25rem · `--space-2` 0.5rem · `--space-3` 0.75rem · `--space-4` 1rem · `--space-6` 1.5rem · `--space-8` 2rem |
| Typography | `--font-sans` (system font stack, **không web font**) · `--font-size-base` 1rem · `--font-size-lg` 1.25rem · `--font-size-xl` clamp(1.75rem, 5vw, 2.5rem) · `--line-height` 1.6 |
| Layout | `--content-max` 72rem · `--card-min` 280px · `--radius` 0.5rem · `--focus-ring` 3px |

**Bảng cặp màu đã tính trước (WCAG 2.2 AA, chữ thường ≥ 4.5:1):**

| Cặp (fg / bg) | Light | Dark |
|---|---|---|
| text / bg | 17.85 | 16.30 |
| text / surface | 16.30 | 13.35 |
| text-muted / bg | 7.58 | 12.02 |
| text-muted / surface | 6.92 | 9.85 |
| accent / bg | 6.70 | 9.90 |
| accent / surface | 6.12 | 8.11 |
| on-accent / accent | 6.70 | 9.90 |
| border / bg (non-text, cần ≥ 3:1) | 4.76 | 3.75 |

> Quy tắc ghép cặp: một rule đặt `background` bằng token nào thì `color` phải là token đã có trong bảng trên với nền đó. Không ghép cặp ngoài bảng.

### 3.3 Theme contract

| Thành phần | Giá trị chốt |
|---|---|
| localStorage key | `theme` |
| Giá trị hợp lệ | `'dark'` \| `'light'` (giá trị khác → coi như chưa đặt) |
| Nơi gắn class | `<html>` (`document.documentElement`) |
| Class | `.dark-theme` (ép tối) / `.light-theme` (ép sáng) — không bao giờ có cả hai |
| Nút toggle | `<button type="button" id="theme-toggle" aria-pressed="false">Dark mode</button>` nằm trong `<header>` |
| `aria-pressed` | `"true"` khi theme hiện tại là dark |
| Nhãn nút | Cố định "Dark mode" (không đổi text → không đổi kích thước → CLS = 0) |

**Thứ tự cascade trong `tokens.css`:**

```
:root                                          → semantic = light
@media (prefers-color-scheme: dark)
  :root:not(.light-theme)                      → semantic = dark   (theo OS, không JS vẫn chạy)
:root.dark-theme                               → semantic = dark   (người dùng ép tối)
html { color-scheme: light dark }  /  .dark-theme { color-scheme: dark }  /  .light-theme { color-scheme: light }
```

**State machine của `theme.js`:**

```
load:   saved = đọc localStorage('theme')  (try/catch → null nếu storage bị chặn)
        theme = saved ∈ {dark, light} ? saved : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        apply(theme)                       (chỉ gắn class khi saved tồn tại; nếu không, để @media tự quyết)
click:  next = current === 'dark' ? 'light' : 'dark'
        apply(next); ghi localStorage('theme', next) (try/catch)
apply:  toggle .dark-theme / .light-theme trên <html>; set aria-pressed
```

> Không dùng `light-dark()`: tính đến 10/2026 mới là Baseline *Newly available*, vi phạm `project-rules.md` §2.4.

### 3.4 Layout contract

| Selector | Kiểu layout | Quy tắc |
|---|---|---|
| `header` | Flex (1D) | tên + nút toggle, `flex-wrap: wrap`, `gap` |
| `nav[aria-label="Primary"] ul` | Flex (1D) | `flex-wrap: wrap`, `gap: var(--space-4)`, bỏ bullet |
| `main` | Khối căn giữa | `max-width: var(--content-max)`, `margin-inline: auto`, padding ngang `var(--space-4)` (16px) |
| `body > header/nav/main/footer` | Dải full-width | `padding-inline: max(var(--space-4), calc((100% - var(--content-max)) / 2))` → gutter 16px trên mobile, nội dung tối đa `--content-max`, không cần `<div>` wrapper |
| `body > header` | Grid (2D) | areas `"title toggle" / "tagline tagline"` |
| `.timeline` > `.experience-item` | Grid | mobile 1 cột; ≥ 48rem: cột trái vai trò + thời gian, cột phải thành tích |
| `.project-grid`, `.skill-grid` | Grid (2D) | `repeat(auto-fit, minmax(min(var(--card-min), 100%), 1fr))`, `gap: var(--space-6)` |
| `.project-card`, `.skill-group` | Flex column | nền `--color-surface`, viền `--color-border`, bo `--radius`; footer card `margin-top: auto` để link thẳng hàng |
| `.tag-list` | Flex wrap (1D) | tag công nghệ dùng chung cho project và skills |
| `.skip-link` | Ẩn ngoài viewport, hiện khi `:focus` | dùng `transform`, không dùng `display:none` (vẫn phải focus được) |

- Mobile-first: style gốc cho 375px, chỉ thêm `@media (min-width: ...)` khi cần.
- `min(var(--card-min), 100%)` đảm bảo màn rất hẹp (320px) cũng không tràn ngang.
- Không đặt `width` cố định bằng px lớn hơn 343px (375 − 2×16) cho bất kỳ phần tử nào.

### 3.5 HTML hook (T-02-0) – thay đổi so với Exercise 1

- Copy `Exercise_1/index.html` → `Exercise_2/index.html`, giữ nguyên cây landmark đã đạt ở Exercise 1.
- Thêm 2 `<link>` + 1 `<script defer>` (mục 3.1) và nút `#theme-toggle` (mục 3.3).
- Bọc các `<article>` trong `<ul class="project-grid">` → `<li><article class="project-card">`.
- Cập nhật nội dung theo CV (Backend & AI-oriented):
  - `h1`: "<span lang=\"vi\">Quảng Phú Hưng</span> — Backend &amp; AI Developer". Tên có dấu được bọc `lang="vi"` để trình đọc màn hình phát âm đúng và trình duyệt chọn font hỗ trợ tiếng Việt. Không dùng web font: system font (Segoe UI, SF Pro, Roboto) đã đủ dấu tiếng Việt và không tốn request trên Fast 3G.
  - Thêm `section#experience` (`ol.timeline > li > article.experience-item`, ngày tháng dùng `<time datetime>`) và `section#skills` (`ul.skill-grid > li.skill-group > h3 + ul.tag-list`). Nav thứ tự: About → Experience → Projects → Skills → Contact (theo thứ tự CV).
  - Project cards: **GreenGrass** (NestJS, React, PostgreSQL), **Diabetes QnA (RAG)** (Python, ChromaDB, Ollama), **RL Dynamic Pricing** (Python, RL), **Chuck King** (JavaScript, Canvas).
  - Link repo là URL thật trên `github.com/Prosperum26` (GreenGrass có 2 link: backend + frontend); `aria-label` bắt đầu bằng text hiển thị.
  - Liên hệ dùng email trường `24520626@gm.uit.edu.vn`.
- Không thêm ảnh ở màn hình đầu → LCP là text (`h1`), đạt ngân sách dễ dàng.

---

## 4. Sub-tasks

| ID | Sub-task | File được chạm | Input | Output | Phụ thuộc |
|---|---|---|---|---|---|
| T-02-0 | HTML hook | `index.html` | Mục 3.1, 3.3, 3.5 | HTML có link CSS/JS, nút toggle, `.project-grid` | Exercise 1 |
| T-02A | Tokens & Reset | `css/tokens.css` | Mục 3.2, 3.3 (cascade) | Primitive + semantic token, dark override, reset, typography, `:focus-visible`, reduced motion | T-02-0 |
| T-02B | 2D Grid Layout | `css/layout.css` | Mục 3.4 | Flex nav/header, grid project, skip-link, responsive 375px | T-02A |
| T-02C | Theme Engine | `js/theme.js` | Mục 3.3 (state machine) | Đọc/ghi `theme`, fallback `matchMedia`, `aria-pressed` | T-02A, T-02-0 |
| T-02D | Audit tổng | Chỉ đọc | Toàn bộ `Exercise_2/` | Danh sách lỗi theo ma trận mục 5 (chưa sửa) | T-02A → T-02C |

### Kế hoạch prompt cho từng sub-task

Mọi prompt đều mở đầu bằng: *"Đọc project-rules.md (đính kèm) trước khi đề xuất code. Chỉ làm đúng task `<ID>`, chỉ sửa file `<file>`."*

- **T-02-0:** "Copy cây landmark của `Exercise_1/index.html` sang `Exercise_2/index.html`. Thêm đúng các `<link>`/`<script defer>` ở contract 3.1, nút `#theme-toggle` ở 3.3, bọc project thành `ul.project-grid > li > article.project-card`, cập nhật nội dung theo 3.5. Chỉ HTML, không inline style/script."
- **T-02A:** "Viết `css/tokens.css` theo bảng token 3.2 và cascade 3.3. Hex chỉ được nằm trong khối primitive của `:root`. Thêm reset theo `project-rules.md` §4, `:focus-visible` dùng `--color-focus`, và `prefers-reduced-motion`. Không viết layout."
- **T-02B:** "Viết `css/layout.css` theo bảng 3.4. Chỉ dùng `var(--*)` đã khai báo trong `tokens.css` (dán danh sách token). Mobile-first, không tràn ngang ở 375px. Không khai báo token mới, không đụng màu ngoài cặp ở 3.2."
- **T-02C:** "Viết `js/theme.js` theo state machine 3.3. `const`/`let`, `addEventListener`, bọc localStorage trong `try/catch`, không `innerHTML`. Giải thích vì sao không đổi text nút."
- **T-02D (review):** "Audit `Exercise_2/` theo ma trận mục 5. **Chỉ liệt kê lỗi, chưa sửa.**" → tự đánh giá từng lỗi, sửa ở commit `fix(...)` riêng theo đúng loại file.

---

## 5. Strict Acceptance Criteria Matrix

| # | Tiêu chí | Cách kiểm tra | Task |
|---|---|---|---|
| A1 | **Monolithic Dump Ban** – không commit nào trộn CSS + JS | `git log --stat --oneline` → không commit nào chứa cả `.css` và `.js` (HTML đi chung commit T-02A, xem mục 7) | Tất cả |
| A2 | 0 hex/rgb hardcode ngoài khối primitive | `grep -nE "#[0-9a-fA-F]{3,8}\b\|rgb\(" Exercise_2/css/layout.css` → rỗng; trong `tokens.css` chỉ khớp ở các dòng `--palette-*` | T-02A, T-02B |
| A3 | Không có token "ma" (dùng mà chưa khai báo) | So `grep -oh "var(--[a-z0-9-]*" Exercise_2/css/*.css \| sort -u` với `grep -oh "^\s*--[a-z0-9-]*" Exercise_2/css/tokens.css \| sort -u` | T-02A, T-02B |
| A4 | Render sạch ở 375px, 0 cuộn ngang | DevTools → Device toolbar 375×667 → Console chạy `document.documentElement.scrollWidth <= innerWidth` → `true` | T-02B |
| A5 | Contrast ≥ 4.5:1 cả 2 theme | Lighthouse Accessibility (light rồi dark) không có lỗi *contrast*; DevTools color picker kiểm từng cặp ở 3.2 | T-02A |
| A6 | Theme lưu đúng key | Toggle → Application → Local Storage: chỉ có key `theme` = `dark`/`light` → reload giữ nguyên theme | T-02C |
| A7 | Fallback OS | Xoá key `theme` → DevTools Rendering → *Emulate prefers-color-scheme: dark* → trang tối, `aria-pressed="true"` | T-02A, T-02C |
| A8 | 0 lỗi console khi toggle liên tục | Console mở, nhấn toggle 20 lần (cả bằng chuột và `Enter`/`Space`) → không có error/warning; thử thêm ở cửa sổ ẩn danh | T-02C |
| A9 | Bàn phím: Tab & Enter đầy đủ | Chỉ dùng phím: `Tab` → skip-link hiện → `Enter` tới main; `Tab` qua toggle (`Enter` đổi theme) → nav links (`Enter` cuộn đúng section) → link project; luôn thấy focus ring | T-02B, T-02C |
| A10 | CLS = 0 | DevTools Performance → record reload + toggle 3 lần → *Layout Shifts* trống; Lighthouse CLS = 0 | T-02B, T-02C |
| A11 | LCP < 2.0s trên Fast 3G | Network: *Fast 3G*, Disable cache → Performance record reload → LCP marker < 2000 ms (LCP element là text `h1`/`p`, không có ảnh; favicon tắt bằng `<link rel="icon" href="data:,">` để không có request 404) | Tất cả |
| A12 | Grep sạch theo DoD | `grep -rnE "var \|innerHTML\|onclick=\|keyCode\|keypress\|style=\"\|https://cdn" Exercise_2/` → rỗng | T-02D |

---

## 6. Live Defense runbook (3 phút, sửa trong 60s)

Kịch bản: giảng viên sửa 1 CSS token, mình phải phát hiện và sửa trong 60 giây.

| Kịch bản thay đổi | Triệu chứng | Cách tìm nhanh | Sửa |
|---|---|---|---|
| Đổi giá trị primitive (vd. `--palette-slate-900` → màu nhạt) | Chữ mờ, Lighthouse báo contrast | So với bảng 3.2 | Trả lại hex trong **1 dòng** primitive |
| Đổi mapping semantic (vd. `--color-text: var(--palette-slate-300)` ở light) | Chữ mờ chỉ ở 1 theme | `grep -n "\-\-color-text" Exercise_2/css/tokens.css` | Sửa 1 dòng mapping theo bảng 3.2 |
| Đổi tên / xoá token | Thuộc tính mất màu, DevTools gạch "invalid" | Lệnh A3 → token thiếu | Khôi phục tên trong `:root` |
| Đổi `--card-min` lớn (vd. 500px) | Tràn ngang ở 375px | Lệnh A4 trả `false` | Trả lại 280px (đã có `min(..., 100%)` chặn bớt) |
| Xoá khối `:root.dark-theme` | Nút toggle không có tác dụng | Elements: `<html class="dark-theme">` nhưng màu không đổi | Thêm lại khối theo cascade 3.3 |

> Vì hex chỉ nằm ở tầng primitive và rule chỉ dùng tầng semantic, mọi thay đổi màu đều là **sửa 1 dòng trong `tokens.css`** (`project-rules.md` §2.7).

---

## 7. Kế hoạch commit

| # | Commit message | Nội dung | Loại file |
|---|---|---|---|
| 1 | `feat(css): tokens & reset` | File này + `Exercise_2/index.html` (T-02-0) + `Exercise_2/css/tokens.css` (T-02A) | `.md` + `.html` + `.css` |
| 2 | `feat(css): responsive grid` | `Exercise_2/css/layout.css` (T-02B) + `index.html` (thêm Experience, Skills, tên có dấu) + file này | `.css` + `.html` + `.md` |
| 3 | `feat(js): dark mode engine` | `Exercise_2/js/theme.js` (T-02C) | `.js` |
| 4+ | `fix(css): ...` / `fix(js): ...` | Bản sửa sau audit T-02D, mỗi commit 1 loại file | 1 loại |

> Quyết định: chỉ dùng đúng 3 commit bắt buộc của đề. HTML hook (T-02-0) không có commit riêng mà đi chung commit T-02A.
> Mục này đi ngược `project-rules.md` §6 (không trộn HTML + CSS; `docs(spec)` commit trước code) và được chấp nhận có chủ đích. Luật của đề (A1) chỉ cấm trộn **CSS + JS**, và yêu cầu này vẫn được giữ.

---

## 8. Rủi ro & quyết định đã chốt

| Rủi ro | Quyết định | Lý do |
|---|---|---|
| Flash sai theme (FOUC) khi người dùng đã lưu theme khác OS, vì script là `defer` | Chấp nhận; `@media` xử lý đúng ngay cho người chưa lưu | Script chặn render trong `<head>` vi phạm §5 (`defer`/module) và cộng thêm 1 RTT vào LCP. Đổi màu không phải layout shift nên CLS vẫn = 0 |
| Khối dark mapping lặp ở `@media` và `:root.dark-theme` | Chấp nhận lặp ~8 dòng mapping, **hex không lặp** | `light-dark()` chưa Widely available; sửa màu vẫn chỉ là 1 dòng primitive |
| localStorage bị chặn (ẩn danh / chặn cookie) ném `SecurityError` | Bọc mọi truy cập trong `try/catch`, rơi về `matchMedia` | Đảm bảo A8 (0 lỗi console) |
| Web font làm chậm LCP trên Fast 3G | Không dùng web font, chỉ system font stack | Bảo đảm A11 |
| Nhãn nút đổi độ dài khi toggle | Nhãn cố định, trạng thái thể hiện qua `aria-pressed` + style | Bảo đảm A10 |

---

## 9. Prompt log & bằng chứng

| Task | Link prompt | Screenshot | AI sai gì / mình sửa gì |
|---|---|---|---|
| T-02-0 | _(dán link share)_ | — | |
| T-02A | _(dán link share)_ | `screenshots/ex2-contrast-light.png`, `screenshots/ex2-contrast-dark.png` | |
| T-02B | _(dán link share)_ | `screenshots/ex2-375px.png` | |
| T-02C | _(dán link share)_ | `screenshots/ex2-localstorage.png`, `screenshots/ex2-console-clean.png` | |
| T-02D | _(dán link share)_ | `screenshots/ex2-lighthouse.png`, `screenshots/ex2-perf-fast3g.png` | |
