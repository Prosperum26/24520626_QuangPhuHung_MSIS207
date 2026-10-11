# TASK_DECOMPOSITION – Homework 1: Production Portfolio

> Work Breakdown Structure (WBS) cho HW1.
> File này được commit **trước** mọi code (`docs(spec)`), đúng quy tắc §6 của `project-rules.md`.
> Mỗi prompt AI tham chiếu **đúng 1** task ID (ví dụ `T-06-J`) và đính kèm `project-rules.md` + phần contract liên quan.
> Nội dung trang được lấy từ CV (`docs/QuangPhuHung_FPT_QACI_CV.pdf`), không bịa số liệu, không bịa link.

---

## 1. Mục tiêu và phạm vi

Một trang portfolio một trang (single page) cho **Quang Phu Hung**, định hướng Backend & AI, làm **khác các bài Exercise trước** (ít khung card đồng nhất, có nhịp kể chuyện theo hành trình) nhưng **giữ đủ 4 milestone bắt buộc** của thầy:

| Milestone | Commit bắt buộc | Nội dung |
|---|---|---|
| M1 | `fix(a11y): contrast & landmarks` | Audit WCAG 2.2 AA, sửa contrast và landmark |
| M2 | `fix(nav): keyboard trap prevention` | Audit focus trap, đảm bảo không kẹt focus |
| M3 | `fix(security): strict CSP & zero inline handlers` | CSP chặt, 0 `onclick=` / `style=` / inline script |
| M4 | `perf: optimize assets` | Lighthouse 100 (cả 4 nhóm), tối ưu ảnh/font/CSS |

**Ngoài phạm vi:** backend thật, gửi form qua server, đa ngôn ngữ, blog, CMS. Trang là tĩnh, chạy qua Live Server (`http://localhost:5500`), không mở bằng `file:///`.

---

## 2. Định hướng thiết kế: "Harbour Log"

**Ý tưởng:** trang như nhật ký cảng. Mỗi phần là một "mục nhật ký" có số thứ tự, có đường chân trời (horizon) và đường sóng (wave) ngăn cách section. Mục tiêu là phá khuôn "hero + grid card + footer" của Exercise 3/4, nhưng vẫn dùng đúng HTML semantic và CSS grid/flex.

**Phá cách có kiểm soát (được phép):**
- Hero dạng "chân trời": tên lớn, tagline lấy từ CV, đường sóng SVG phía dưới.
- Project xếp so le (`grid-template` có span khác nhau theo thứ tự), đánh số `01`–`05` như mục nhật ký.
- Timeline học vấn / kinh nghiệm dạng `<ol>` có đường dọc bằng CSS, không dùng `<div>` làm khung.
- Hiệu ứng reveal khi cuộn là tùy chọn (T-12), luôn tắt khi `prefers-reduced-motion: reduce`.

**Không được phá (giữ nguyên ràng buộc):**
- Vanilla HTML5 / CSS / ES6+, không framework, không CDN, không `innerHTML`, không `var`, không inline handler.
- Mobile-first ở 375px, không scroll ngang.
- Mọi màu nằm trong `:root` (xem mục 3). Không hex/rgb nào ngoài `:root`.

---

## 3. Palette contract (bộ màu xoay quanh biển)

### 3.1 Bốn màu gốc

| Token | Hex | Vai trò chính |
|---|---|---|
| `--sea-deep` | `#086288` | Màu chủ đạo: tiêu đề, link, nút chính, focus ring (sáng) |
| `--sea-mid` | `#4D8DBA` | Màu trang trí: đường sóng, viền, icon, timeline. **Không dùng làm chữ nhỏ** |
| `--foam` | `#97D7FF` | Điểm nhấn: tiêu đề, link, focus ring (tối). **Không dùng làm chữ nhỏ trên nền sáng** |
| `--sand` | `#FFEFC4` | Nền sáng; chữ trên nền tối |

Một màu dẫn xuất duy nhất, để có nền tối và chữ đậm:

| Token | Hex | Ghi chú |
|---|---|---|
| `--ink` | `#04293A` | Tông tối hơn của `--sea-deep`, cùng tông xanh biển. Dùng làm chữ body (nền sáng) và nền tối |

### 3.2 Khối `:root` (chốt, không đổi tên)

```css
:root {
  --sea-deep: #086288;
  --sea-mid: #4D8DBA;
  --foam: #97D7FF;
  --sand: #FFEFC4;
  --ink: #04293A;

  /* Semantic tokens: rules chỉ dùng các token này */
  --bg: var(--sand);
  --text: var(--ink);
  --heading: var(--sea-deep);
  --link: var(--sea-deep);
  --decor: var(--sea-mid);
  --focus-ring: var(--sea-deep);
  --btn-bg: var(--sea-deep);
  --btn-text: var(--sand);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: var(--ink);
    --text: var(--sand);
    --heading: var(--foam);
    --link: var(--foam);
    --decor: var(--sea-mid);
    --focus-ring: var(--foam);
    --btn-bg: var(--foam);
    --btn-text: var(--ink);
  }
}

:root[data-theme="dark"] {
  /* giống khối dark ở trên, đặt lại để toggle thủ công thắng OS */
  --bg: var(--ink);
  --text: var(--sand);
  --heading: var(--foam);
  --link: var(--foam);
  --decor: var(--sea-mid);
  --focus-ring: var(--foam);
  --btn-bg: var(--foam);
  --btn-text: var(--ink);
}
```

> `color-mix(in srgb, var(--sea-deep) 8%, transparent)` được phép cho nền card, vì nó chỉ đọc token. Không được viết hex mới.

### 3.3 Kiểm tra contrast (WCAG 2.2 AA, đã tính sẵn)

| Cặp | Tỉ lệ | Dùng được cho |
|---|---|---|
| `--text` (`--ink`) trên `--bg` (`--sand`) | 12.5 : 1 | Body text, mọi cỡ |
| `--sea-deep` trên `--sand` | 5.91 : 1 | Tiêu đề, link, nút (chữ `--sand`), focus ring |
| `--sand` trên `--ink` (dark) | 13.3 : 1 | Body text dark |
| `--foam` trên `--ink` (dark) | 9.74 : 1 | Tiêu đề, link, focus ring dark |
| `--ink` trên `--foam` (nút dark) | 9.16 : 1 | Chữ trên nút dark |
| `--sea-mid` trên `--sand` | 3.15 : 1 | **Chỉ** non-text (viền input, icon, sóng). Không dùng cho chữ < 24px |
| `--sea-mid` trên `--ink` | 4.22 : 1 | Non-text dark (trang trí) |
| `--foam` trên `--sea-deep` | 4.33 : 1 | **Chỉ** chữ lớn (≥ 24px hoặc ≥ 18.66px bold) |
| `--foam` trên `--sand` | 1.36 : 1 | **Cấm** (không làm chữ, viền, focus ring) |

Quy tắc dùng: body text luôn là `--text`. Chữ nhỏ không bao giờ đặt trên `--sea-mid` hay `--foam` khi nền sáng. Mục M1 sẽ kiểm tra lại các cặp này bằng DevTools.

---

## 4. Contract kỹ thuật

### 4.1 Data & state

- `#projects[data-state]` là nguồn sự thật duy nhất: `loading | success | error`.
- Hàm `setState(next)` là chỗ duy nhất ghi `data-state` và `aria-busy`. Từ chối giá trị lạ.
- Dữ liệu dự án nằm trong `data/projects.json`. JS chỉ clone `<template id="project-card-tpl">` và điền bằng `textContent`.
- Chống race: mỗi lần `loadProjects()` tăng `requestId`; response muộn bị bỏ qua.

### 4.2 Schema `data/projects.json`

```json
{
  "projects": [
    {
      "id": "greengrass",
      "index": "01",
      "title": "GreenGrass",
      "period": "Mar 2026 – May 2026",
      "summary": "Full-stack event platform with JWT refresh-token rotation, RBAC, and a QR + GPS geofence check-in.",
      "stack": ["React", "NestJS", "PostgreSQL", "Prisma", "Docker"],
      "category": "Full-stack",
      "repoUrl": "https://github.com/Prosperum26"
    }
  ]
}
```

Các field bắt buộc: `id`, `index`, `title`, `period`, `summary`, `stack` (mảng không rỗng), `category`, `repoUrl` (https). Item thiếu field hợp lệ bị bỏ qua. Nếu sau khi lọc còn 0 item, coi như `error` với thông báo rõ.

**Năm dự án lấy từ CV:** GreenGrass, Diabetes QnA System (RAG), RL Dynamic Pricing System, Chuck King (AI Rage Platformer), UIT LaTeX Report Template.
Chưa có link repo riêng: tạm dùng `https://github.com/Prosperum26`. Khi user cung cấp URL repo thật thì sửa một dòng trong JSON.

### 4.3 Thông số CSP (M3, khai báo ngay từ đầu để không phải đổi markup sau)

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'">
```

Meta CSP không hỗ trợ `frame-ancestors`, `report-uri`, `sandbox`. Điều này sẽ ghi vào phần oral defense (Live Server không gửi header được).

### 4.4 Cấu trúc file

```
Homework_1/
├── TASK_DECOMPOSITION.md          ← file này (T-00)
├── PROMPT_LOG.md                  ← T-14: log prompt, lỗi AI, cách sửa
├── README.md                      ← T-15: cách chạy, quyết định thiết kế
├── index.html
├── assets/
│   ├── hero-avatar-{320,640}.{avif,webp,jpg}   ← copy từ Exercise_4/assets
│   └── wave.svg                                 ← T-03-A
├── css/
│   ├── tokens.css                 ← T-02-C (palette :root, dark overrides)
│   ├── layout.css                 ← T-03-C
│   ├── hero.css                   ← T-04-C
│   ├── timeline.css               ← T-05-C
│   ├── project-card.css           ← T-06-C
│   ├── skills.css                 ← T-07-C
│   ├── contact.css                ← T-08-C
│   ├── theme-switcher.css         ← T-09-C
│   ├── nav.css                    ← T-10-C
│   ├── motion.css                 ← T-12-C (tùy chọn)
│   └── noscript.css               ← (nếu cần, khi JS tắt)
├── data/
│   └── projects.json              ← T-06-D
└── js/
    ├── theme-init.js              ← T-09-J1 (chạy đồng bộ trong <head>, KHÔNG inline)
    ├── theme-toggle.js            ← T-09-J2
    ├── nav-toggle.js              ← T-10-J
    ├── project-feed.js            ← T-06-J
    ├── copy-email.js              ← T-08-J
    └── reveal.js                  ← T-12-J (tùy chọn)
```

**Thứ tự script trong `<head>`:** `theme-init.js` là script blocking duy nhất trong head (để tránh chớp sáng khi tải lại trang). Các script còn lại dùng `defer`.

### 4.5 Quy ước

- Class: `kebab-case`. Không dùng tên trùng với tag.
- `data-*` và `id` định nghĩa tại đây và không đổi tên. Các id cố định: `main-content`, `projects`, `projects-title`, `project-card-tpl`, `theme-toggle`, `nav-toggle`, `nav-menu`, `copy-email-btn`, `copy-status`.
- localStorage key: `theme` với giá trị `'dark' | 'light'`. Đọc/ghi trong `try/catch`.

---

## 5. Kế hoạch commit (đường đi của cả bài)

Mỗi dòng là một commit. Tất cả đều atomic, không trộn HTML với CSS hay CSS với JS trong cùng commit.

| Giai đoạn | Commit | Ghi chú |
|---|---|---|
| A | `docs(spec): HW1 task decomposition and palette contract` | T-00 (file này) |
| B | Build v1: `feat(shell)`, `feat(theme)`, `feat(layout)`, `feat(assets)`, `feat(hero)`, `feat(timeline)`, `feat(data)`, `feat(projects)`, `feat(skills)`, `feat(contact)`, `feat(theme-toggle)`, `feat(nav)`, `feat(footer)` | Mỗi task T-xx có một commit riêng (xem mục 6) |
| C1 | `docs(audit): WCAG 2.2 AA findings` | Review mode: chỉ liệt kê, không sửa |
| C2 | **`fix(a11y): contrast & landmarks`** | **M1** |
| C3 | `docs(audit): keyboard & focus-trap findings` | Review mode |
| C4 | **`fix(nav): keyboard trap prevention`** | **M2** |
| C5 | `docs(audit): CSP & inline handler findings` | Review mode (grep, liệt kê) |
| C6 | `refactor(js): move remaining inline logic to addEventListener` | Chỉ nếu C5 có kết quả. Nếu không, bỏ qua và ghi rõ trong PROMPT_LOG |
| C7 | **`fix(security): strict CSP & zero inline handlers`** | **M3** |
| C8 | `docs(perf): Lighthouse baseline` | Ghi điểm mobile + desktop trước khi tối ưu |
| C9 | **`perf: optimize assets`** | **M4** |
| D | `docs(log): HW1 prompt log`, `docs(readme): HW1 run guide and design decisions` | T-14, T-15 |

> **Commit split đề xuất khi đưa bản build xong:** user tự chạy `git commit`. Theo memory `no-auto-commit`, AI không commit hay push.

---

## 6. Task list chi tiết

Mỗi task gồm: file được phép chạm · mô tả · **kiểm tra (DoD)**. Prompt AI chỉ được sửa đúng các file đã liệt kê.

### Giai đoạn B – Build v1

**T-01-H · Shell HTML** — `index.html`
- Boilerplate theo `project-rules.md` §3. Thêm `<meta name="viewport">`, `<title>`, `<meta name="description">`.
- Skip link `href="#main-content"` là phần tử focusable đầu tiên.
- Landmark: `header` → `nav[aria-label="Primary"]` → `main#main-content` → `section`s → `footer`.
- Đúng một `<h1>`. Heading không nhảy cấp.
- Chưa có CSP, chưa có nội dung thật, chỉ có khung và chữ placeholder ngắn.
- DoD: validator HTML không lỗi. Không có `style=`, `onclick=`.

**T-02-C · Tokens & reset** — `css/tokens.css`
- Khối `:root` đúng mục 3.2. Global reset. `html { color-scheme: light dark; }`.
- Style `:focus-visible` dùng `--focus-ring`, outline 3px, offset 3px.
- DoD: `grep -nE "#[0-9a-fA-F]{3,8}" css/tokens.css` chỉ trả về các dòng trong `:root` và khối `[data-theme]`.

**T-03-A · Wave asset** — `assets/wave.svg`
- Một đường sóng SVG một màu (`fill` dùng `currentColor`, không hex). Dùng cho divider.
- DoD: mở trực tiếp file SVG có sóng, không lỗi console.

**T-03-C · Layout** — `css/layout.css`
- Mobile-first 375px. Container max-width, gutter 16px. Section có `scroll-margin-top` để header dính không che heading khi nhảy tới.
- Divider dùng `wave.svg` làm `background` (đọc `var(--decor)` để tô).
- DoD: không scroll ngang ở 375px; không hex.

**T-04-H · Hero** — `index.html` (chỉ section hero)
- `h1` = "Quang Phu Hung". Tagline lấy đúng từ CV: "Backend & AI-oriented student building high-performance full-stack systems".
- Một đoạn giới thiệu 1–2 câu cho người xem (không lặp lời lab, không "zero-div").
- `<picture>` với AVIF → WebP → JPG, `width`/`height` đầy đủ, **không** `loading="lazy"` (đây là LCP).
- Hai CTA: `#projects` và `#contact`.
- DoD: alt có nghĩa; không `loading="lazy"` trên avatar.

**T-04-C · Hero style** — `css/hero.css`
- Tên lớn, đường chân trời (horizon) bằng border `var(--decor)`. Avatar bo tròn hoặc cắt theo hình sóng bằng `clip-path`.
- DoD: tương phản tiêu đề đạt 4.5:1 (tra theo mục 3.3).

**T-05-H · Journey (timeline)** — `index.html` (section `#journey`)
- `<ol>` mục học vấn: UIT (B.Sc. Information Systems, 2024–present, Ranked 1st Advanced Program Sem 1 AY 2025–2026).
- `<ol>` kinh nghiệm: Team Leader WebDev Adventure 2026 (Consolation Prize), Team Leader Fessior DevCamp 2026 (Frontendly).
- Mỗi mục là `<li>` với `<time>` và `<h3>`.
- DoD: heading bắt đầu từ `h2` `Journey`, rồi `h3`.

**T-05-C · Timeline style** — `css/timeline.css`
- Đường dọc bằng `border-inline-start` trên `ol`, chấm tròn bằng `::before`. Dùng `var(--decor)`.

**T-06-D · Project data** — `data/projects.json`
- 5 mục theo schema §4.2. Nội dung tóm tắt viết lại theo văn phong người xem, bám đúng ý trong CV. Không thêm số liệu (sao, lượt tải) không có trong CV.
- DoD: JSON hợp lệ (`python -m json.tool` hoặc DevTools không lỗi). Mọi `repoUrl` là https.

**T-06-H · Project section markup** — `index.html` (section `#projects`)
- `<section id="projects" aria-labelledby="projects-title" data-state="loading" aria-busy="true">`.
- Khối `loading` (skeleton có `aria-hidden="true"`), khối `error` (`role="alert"` và nút `Retry` là `<button>` thật), `<ul id="project-list">` rỗng.
- `<template id="project-card-tpl">` chứa khung `<article>` với `<h3>`, `<p>`, danh sách stack `<ul>`, link GitHub.
- DoD: HTML không có `innerHTML` hay `style=`.

**T-06-J · Project feed controller** — `js/project-feed.js`
- `fetch('data/projects.json')` + `async/await` + `try/catch`. Timeout 8s bằng `AbortController`.
- Lỗi mạng, HTTP ≠ 2xx, JSON hỏng, không item hợp lệ đều chuyển sang `error`.
- Render bằng `template.content.cloneNode(true)` và `textContent`. Không `innerHTML`.
- Nút Retry gọi lại `loadProjects()`, đưa focus về `#projects-title`.
- DoD: tắt mạng trong DevTools → thấy `error`; click Retry → quay về `loading`.

**T-06-C · Project card style** — `css/project-card.css`
- Grid `repeat(auto-fit, minmax(280px, 1fr))`. Mỗi card có số `index` lớn (`01`–`05`) bằng `--decor`.
- Stack là badge bằng Flexbox, `gap`, không margin hack.
- Trạng thái ẩn/hiện theo `#projects[data-state="…"]`. JS không đặt `style`.
- DoD: 375px không scroll ngang; trạng thái `error` và `loading` không chồng nhau.

**T-07-H/C · Skills** — `index.html` (section `#skills`) + `css/skills.css`
- Nhóm theo CV: AI & Machine Learning · Backend · Frontend · Languages · Infrastructure & Tools.
- Mỗi nhóm là `<section>` trong `<ul>` với `<h3>`. Badge bằng Flexbox.
- Không JS.
- DoD: không có chữ nhỏ trên `--sea-mid`.

**T-08-H/C · Contact** — `index.html` (section `#contact`) + `css/contact.css`
- Email `qphunguit@gmail.com` dạng `<a href="mailto:…">`. Liên kết GitHub `https://github.com/Prosperum26` và LinkedIn `https://linkedin.com/in/phu-hung-quang`.
- Không đưa số điện thoại lên trang (quyết định riêng tư, ghi trong README).
- Nút `Copy email` có `id="copy-email-btn"`, và vùng `<p id="copy-status" role="status">`.
- DoD: link có text nhìn thấy khớp `aria-label` (WCAG 2.5.3).

**T-08-J · Copy email** — `js/copy-email.js`
- `navigator.clipboard.writeText` trong `try/catch`. Thành công thì ghi "Copied" vào `#copy-status`; thất bại thì báo "Copy failed. Select the address and copy it manually." Không dùng `alert()`.
- DoD: không lỗi console khi clipboard bị chặn.

**T-09-J1 · Theme init (chặn chớp sáng)** — `js/theme-init.js`
- Chạy **đồng bộ** trong `<head>` (không `defer`, không inline). Đọc `localStorage.theme` trong `try/catch`; không có thì dùng `matchMedia('(prefers-color-scheme: dark)')`. Đặt `document.documentElement.dataset.theme`.
- DoD: reload trang dark không thấy nền sáng nháy.

**T-09-J2 · Theme toggle** — `js/theme-toggle.js`
- Nút `#theme-toggle` có `aria-pressed` đồng bộ với theme hiện tại. Click thì đổi `data-theme` và ghi localStorage.
- DoD: lựa chọn còn sau khi reload; `aria-pressed` đúng sau mỗi lần click.

**T-09-H/C · Theme toggle markup & style** — `index.html` (trong header) + `css/theme-switcher.css`
- Nút chữ "Dark" / "Light" (không chỉ icon). Trạng thái nhấn (`aria-pressed="true"`) dùng nền `--btn-bg`, chữ `--btn-text`. Hit area ≥ 24×24 CSS px (WCAG 2.5.8).

**T-10-H/C · Nav** — `index.html` (header) + `css/nav.css`
- Mobile (< 768px): `button#nav-toggle` có `aria-expanded` và `aria-controls="nav-menu"`, `ul#nav-menu` ẩn khi `hidden`.
- Desktop: liên kết nằm ngang bằng Flexbox, không có nút.
- Link trỏ tới `#hero`, `#journey`, `#projects`, `#skills`, `#contact`. Mọi `href="#x"` phải có `id="x"` tương ứng.

**T-10-J · Nav toggle** — `js/nav-toggle.js`
- Click đổi `aria-expanded` và `hidden`. Esc đóng menu và trả focus về `#nav-toggle`. Click ra ngoài đóng menu.
- **Không** dùng focus trap. Menu là disclosure (không phải modal), nên Tab đi ra khỏi menu bình thường. Đây là quyết định có chủ đích và M2 sẽ kiểm tra lại.
- DoD: dùng `keydown` và `event.key` (không `keyCode`), có `if (event.repeat) return;`.

**T-11 · Footer** — `index.html` (`footer`) + `css/layout.css` (phần footer)
- `footer` (contentinfo) chứa dòng bản quyền và link quay lại đầu trang.
- DoD: chỉ có một `footer` trực tiếp trong `body`.

**T-12-C/J · Reveal (tùy chọn, làm sau cùng)** — `css/motion.css` + `js/reveal.js`
- IntersectionObserver thêm class khi phần tử vào khung. Có `@media (prefers-reduced-motion: reduce)` tắt hoàn toàn chuyển động.
- Nếu bỏ qua task này: ghi rõ trong PROMPT_LOG. Không ảnh hưởng milestone.

**T-13 · Responsive QA (kiểm tra, không commit code)**
- Mở `http://localhost:5500` và kiểm tra ở 375, 768, 1280 px. Ghi lỗi nếu có.
- Kết quả đưa vào T-14.

### Giai đoạn C – Audit và fix (4 milestone bắt buộc)

**C1 · `docs(audit): WCAG 2.2 AA findings`** (review mode, chỉ liệt kê)
- Kiểm tra từng mục: contrast mọi cặp chữ/nền (đối chiếu mục 3.3), landmark (đúng một `main`, `header`, `footer`), heading order, `alt`, `label`, focus visible, hit area ≥ 24px (2.5.8), `Focus Not Obscured` (2.4.11, header dính có che heading không), reflow 320px (1.4.10), `prefers-reduced-motion`.
- Công cụ: DevTools → Lighthouse (Accessibility) và Elements → Accessibility pane. Ghi lại số liệu, không sửa.

**C2 · `fix(a11y): contrast & landmarks` — M1**
- Sửa đúng các lỗi đã liệt kê ở C1. Không sửa thứ không có trong danh sách.
- DoD: Lighthouse Accessibility = 100 ở 375px và 1280px. Không còn lỗi contrast nào trong C1.

**C3 · `docs(audit): keyboard & focus-trap findings`** (review mode)
- Tab/Shift+Tab từ đầu đến cuối trang, mở và đóng nav mobile, mở và đóng theme toggle, Retry trên trạng thái `error`. Ghi mọi chỗ focus bị kẹt hoặc bị mất.
- Riêng nav: kiểm tra Esc có trả focus về nút, và Tab có đi ra khỏi menu không.

**C4 · `fix(nav): keyboard trap prevention` — M2**
- Sửa đúng các điểm đã liệt kê ở C3. Nếu C3 không có lỗi, commit này chỉ thêm test thủ công vào PROMPT_LOG, không tạo commit rỗng.
- DoD: Tab đi vòng đủ một lần qua toàn trang rồi trở về trình duyệt; không có chỗ nào giữ focus.

**C5 · `docs(audit): CSP & inline handler findings`** (review mode)
- Chạy các lệnh grep ở mục 7 và liệt kê kết quả. Không sửa.

**C6 · `refactor(js): ...`** (chỉ khi C5 có kết quả)
- Chuyển logic còn lại sang `addEventListener` trong file JS. Không đụng CSS.

**C7 · `fix(security): strict CSP & zero inline handlers` — M3**
- Thêm meta CSP §4.3 vào `<head>` của `index.html`.
- Đảm bảo không còn `on*=`, `style=`, `<script>` có nội dung trong HTML.
- Kiểm tra trang vẫn hoạt động: theme, nav, projects, copy email. Mỗi lỗi CSP xuất hiện trong console là một lỗi phải sửa, không được nới CSP.
- DoD: console không có lỗi `Refused to …`.

**C8 · `docs(perf): Lighthouse baseline`** (review mode)
- Chạy Lighthouse (Performance, Accessibility, Best Practices, SEO) ở mobile và desktop, chế độ Incognito, qua Live Server.
- Ghi điểm và danh sách "Opportunities" vào PROMPT_LOG (hoặc ghi vào một đoạn trong commit message nếu cần). Không sửa.

**C9 · `perf: optimize assets` — M4**
- Ảnh: kích thước đúng với khung hiển thị (không để ảnh 640 hiện ở khung 160px), AVIF/WebP trước, `width`/`height` đầy đủ, `fetchpriority="high"` cho avatar LCP.
- CSS: bỏ rule không dùng, không `@import`. Không `@font-face` từ bên ngoài. Dùng system font stack.
- JS: mọi script `defer`, trừ `theme-init.js`.
- DoD: Lighthouse Performance = 100 ở mobile và desktop. Nếu có chỉ số dưới 100, ghi rõ nguyên nhân trong PROMPT_LOG. Không ép điểm bằng cách bỏ nội dung.

### Giai đoạn D – Đóng

**T-14 · PROMPT_LOG** — `PROMPT_LOG.md` (`docs(log)`)
- Mỗi task: prompt đã dùng, lỗi AI đã mắc, cách sửa, ảnh chụp kết quả nếu có. Yêu cầu của `project-rules.md` §8.

**T-15 · README** — `README.md` (`docs(readme)`)
- Cách chạy (Live Server, `localhost:5500`), cách kiểm tra (các lệnh grep ở mục 7), quyết định thiết kế (palette, CSP meta, nav không dùng focus trap, không đưa số điện thoại lên trang).

---

## 7. Cổng kiểm tra (chạy từ thư mục gốc repo, Git Bash)

```bash
# 0 inline handler (onclick=, onload=, …)
grep -rnE "\son[a-z]+\s*=" Homework_1 --include=*.html --include=*.js

# 0 style="" trong markup
grep -rn 'style=' Homework_1 --include=*.html

# 0 <script> có nội dung trong HTML (chỉ được có <script src=…>)
grep -rnE "<script>[^<]" Homework_1 --include=*.html

# 0 innerHTML, var, keyCode, keypress
grep -rnE "innerHTML|\bvar |keyCode|keypress" Homework_1 --include=*.js

# Hex/rgb chỉ nằm trong :root (kết quả chỉ được là tokens.css)
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(" Homework_1/css

# Không có URL ngoài trong CSS/JS (href trong HTML thì được)
grep -rnE "https?://" Homework_1/css Homework_1/js
```

---

## 8. Definition of Done (áp dụng cho mọi task)

- [ ] Đúng contract trong mục 3 và 4 (token, id, data-attribute, localStorage key).
- [ ] Đúng 375px không scroll ngang.
- [ ] Dùng bàn phím đủ được (Tab, Shift+Tab, Enter, Space, Esc).
- [ ] Không lỗi console.
- [ ] Các lệnh ở mục 7 không trả về dòng vi phạm.
- [ ] Prompt đã ghi vào PROMPT_LOG. Lỗi AI đã ghi lại.
- [ ] Commit đúng một sub-task, đúng message đã định.

---

## 9. Rủi ro và cách xử lý

| Rủi ro | Dấu hiệu | Cách xử lý |
|---|---|---|
| Lighthouse Performance không đạt 100 ở mobile | Điểm 85–99, LCP chậm | Giảm kích thước avatar, preload LCP, bỏ `theme-init.js` nếu nó chặn quá lâu (đo trước khi bỏ) |
| CSP meta chặn `fetch` JSON | Console `Refused to connect` | `connect-src 'self'` đã cho phép. Nếu vẫn lỗi, kiểm tra đường dẫn tương đối |
| Mất chữ trên nền `--foam` ở chế độ sáng | Contrast < 4.5 | Dùng `--sea-deep` cho chữ, `--foam` chỉ cho nền dark và decor |
| Nav mobile bị kẹt focus | Tab không ra khỏi menu | Bỏ mọi `keydown` nuốt Tab. Chỉ xử lý Esc |
| Quá phá cách, mất semantic | Heading nhảy cấp, `div` làm khung chính | Kiểm tra lại T-01-H, dùng `section`/`article`/`ol`/`ul` |

---

## 10. Câu hỏi mở (không chặn việc, mặc định đã chọn)

1. **Link repo thật từng dự án:** mặc định dùng trang GitHub `Prosperum26`. Cần URL repo khi user có.
2. **Số điện thoại trên trang:** mặc định **không** đưa lên (vì trang công khai). Đổi được ở T-08-H.
3. **Làm T-12 (reveal) không:** mặc định làm sau khi M4 xong, nếu còn thời gian. Không ảnh hưởng điểm milestone.
