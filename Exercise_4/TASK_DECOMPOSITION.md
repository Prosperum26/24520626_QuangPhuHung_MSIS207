# TASK_DECOMPOSITION – Exercise 4: Resilient Component Architecture

> Work Breakdown Structure (WBS) cho Exercise 4.
> Tài liệu này được viết và commit **trước** khi prompt AI sinh code (`docs(spec)` đi trước mọi commit code).
> Mọi prompt AI đều tham chiếu đúng **1** task ID dưới đây và đính kèm `project-rules.md` + phần contract liên quan.
> **Luật của đề:** không bao giờ prompt AI làm cả 4 state cùng lúc. Mỗi state có prompt riêng và commit riêng.

---

## 1. Mục tiêu bài

Biến section **Projects** của portfolio (Exercise 3) từ 4 card viết cứng trong HTML thành **1 component nạp dữ liệu bằng `fetch`**, có đủ 4 state theo "4-State Resilient Component Contract":

| Sub-task (slide) | State | Hiển thị |
|---|---|---|
| T-03A | `loading` | Skeleton shimmer thuần CSS, `aria-busy="true"` |
| T-03B | `success` | Grid các project card, metadata là badge xếp bằng Flexbox |
| T-03C | `empty` | Thông báo "chưa có project" + link GitHub |
| T-03C | `error` | Thông báo lỗi `role="alert"` + nút **Retry** là `<button>` thật |
| T-03D | (controller) | `project-feed.js`: `fetch` + `async/await` + `try/catch`, chuyển state |

**Vì sao chọn Projects mà không làm widget riêng:**

- "Live Data State: Flexbox metadata badges & Grid list" của đề chính là project card của Ex3: badge category + badge tech stack (Flex), danh sách card (Grid). Dùng lại được `project-card.css` và bộ lọc.
- Nội dung dữ liệu lấy **nguyên văn** từ 4 card thật của Ex3, chỉ chuyển sang JSON. Không bịa project, không bịa số sao/fork (`project-rules.md` §2.8).

**Nguyên tắc (giữ nguyên từ Ex3):**

1. **State nằm trên DOM:** `#projects[data-state]` là nguồn sự thật duy nhất. Không có cờ `isLoading`, `hasError`.
2. **JS chỉ ghi attribute, CSS chỉ đọc attribute.** Ẩn/hiện từng khối theo `[data-state="…"]`, JS không đặt `style`.
3. **Markup của card nằm trong HTML** (`<template>`), JS chỉ clone và điền bằng `textContent`. Không `innerHTML`.
4. **Progressive enhancement:** tắt JS thì không có skeleton quay mãi; thay vào đó là link sang GitHub.

**Ngoài phạm vi:** gọi GitHub API thật (rate limit 60 req/h, phụ thuộc mạng lúc vấn đáp; xem mục 8), phân trang, cache/Service Worker, sửa các section khác của trang.

> Quy ước ID: theo đúng slide, `T-03A…T-03D`. Ex3 đã dùng dạng `T-03-<số>` nên không trùng.
> Hậu tố loại: `-H` = HTML, `-C` = CSS, `-J` = JS, `-D` = data (JSON).

---

## 2. Quy trình 4 bước áp dụng

| Bước | Áp dụng trong bài |
|---|---|
| 1. Functional Slicing | Chia theo **state** (loading → success → empty → error), trong mỗi state chia tiếp theo loại file (H → C → J) |
| 2. Contract Definition | Chốt trước state machine, `data-state`, cấu trúc JSON, `<template>`, token skeleton (mục 3) |
| 3. Atomic Generation | 1 prompt = 1 task ID = 1 state. JS của mỗi state là 1 prompt riêng, viết tiếp lên controller đã có |
| 4. Contract Verification | Mỗi state có cổng kiểm tra riêng (mục 5), ép được state bằng `?demo=` hoặc DevTools throttling |

---

## 3. Contract (chốt trước khi viết code)

### 3.1 State machine

```
                 ┌──────────────────────────────────────────────┐
  (page load)    │                 loading                       │
 ───────────────▶│  aria-busy="true", skeleton, status "Loading" │
                 └──────────────┬───────────────────────────────┘
                                │ fetch(DATA_URL, timeout 8s)
        ┌───────────────────────┼─────────────────────────────┐
        │ ok, ≥ 1 project hợp lệ│ ok, mảng rỗng                │ network / timeout /
        ▼                       ▼                             │ HTTP ≠ 2xx / JSON hỏng /
   ┌─────────┐            ┌─────────┐                         │ có item nhưng 0 hợp lệ
   │ success │            │  empty  │                         ▼
   └─────────┘            └─────────┘                    ┌─────────┐
   (render card,          (panel empty,                  │  error  │
    bộ lọc hoạt động)      link GitHub)                  └────┬────┘
                                                              │ click Retry
                                                              ▼
                                                         loading (lại)
```

| Từ | Sự kiện | Đến | Việc phải làm |
|---|---|---|---|
| — | `DOMContentLoaded` (script `defer`) | `loading` | HTML đã sẵn `data-state="loading"`; JS gọi `load()` |
| `loading` | response ok + `projects.length > 0` + ≥ 1 item hợp lệ | `success` | Render card từ template, `aria-busy="false"`, phát event `projects:rendered` |
| `loading` | response ok + `projects.length === 0` | `empty` | `aria-busy="false"` |
| `loading` | mọi lỗi (bảng 3.6) | `error` | `aria-busy="false"`, ghi thông báo theo loại lỗi vào `.feed-error-message` |
| `error` | click `.feed-retry` | `loading` | Xoá card cũ (nếu có), focus về `#projects-title`, gọi lại `load()` |
| `success` / `empty` | — | — | Trạng thái cuối, không có transition |

- **4 state, không hơn:** `loading | success | empty | error`. Không thêm `idle`: trang luôn bắt đầu nạp ngay.
- `empty` (API trả 0 project) **khác** "lọc ra 0 card" (bộ lọc của Ex3). Cái sau vẫn là `success`, dòng `.filter-status` đã xử lý.
- Hàm `setState(next)` là **chỗ duy nhất** ghi `data-state` và `aria-busy`. Nó từ chối giá trị không thuộc `STATES`.
- Chống race: mỗi lần `load()` tăng `requestId`; response về muộn của request cũ bị bỏ qua.

### 3.2 Cấu trúc file

```
Exercise_4/
├── index.html                     ← copy Ex3; sửa section#projects
├── assets/                        ← copy Ex3 (avatar)
├── data/
│   ├── projects.json              ← T-03B-D: 4 project thật của Ex3
│   ├── projects-empty.json        ← T-03C-D: { "projects": [] }
│   └── projects-malformed.json    ← T-03C-D: JSON cố tình hỏng cú pháp
├── css/
│   ├── tokens.css                 ← copy Ex3 + token skeleton (T-03A-C)
│   ├── layout.css                 ← copy Ex3
│   ├── noscript.css               ← T-03A-C: ẩn skeleton khi tắt JS
│   └── components/
│       ├── hero.css, theme-switcher.css, skills-matrix.css, contact-form.css  ← copy Ex3
│       ├── skeleton.css           ← T-03A-C
│       ├── project-card.css       ← copy Ex3, sửa ở T-03B-C
│       └── feed-state.css         ← T-03C-C: panel empty/error
└── js/
    ├── theme.js, contact-form.js  ← copy Ex3, không sửa
    ├── project-filter.js          ← copy Ex3, sửa ở T-03D-J
    └── project-feed.js            ← T-03A-J → T-03B-J → T-03C-J1 → T-03C-J2
```

Thứ tự trong `<head>` (thêm vào sau link/script của Ex3):

```html
<link rel="stylesheet" href="css/components/skeleton.css">
<link rel="stylesheet" href="css/components/feed-state.css">
<noscript><link rel="stylesheet" href="css/noscript.css"></noscript>
…
<script src="js/project-filter.js" defer></script>
<script src="js/project-feed.js" defer></script>   <!-- sau filter: filter phải nghe event trước khi feed phát -->
```

> `<noscript>` chứa `<link>` là hợp lệ trong `<head>` theo HTML spec. Cách này tránh inline `style` (`project-rules.md` §3).

### 3.3 Markup `section#projects`

```html
<section id="projects" aria-labelledby="projects-title"
         data-state="loading" aria-busy="true">
  <h2 id="projects-title" tabindex="-1">Projects</h2>

  <!-- Bộ lọc của Ex3, giữ nguyên. Chỉ hiện ở success (CSS) -->
  <ul class="filter-bar" aria-label="Filter projects by category"> … </ul>
  <p class="filter-status" role="status"></p>

  <!-- Thông báo trạng thái chung cho screen reader -->
  <p class="feed-status visually-hidden" role="status">Loading projects…</p>

  <!-- T-03A: loading -->
  <ul class="skeleton-list" aria-hidden="true">
    <li class="skeleton-card">
      <span class="skeleton-item skeleton-title"></span>      <!-- = header (badge category) -->
      <span class="skeleton-text">                             <!-- = mô tả, 5 dòng -->
        <span class="skeleton-item skeleton-line"></span> ×4
        <span class="skeleton-item skeleton-line skeleton-line-short"></span>
      </span>
      <span class="skeleton-item skeleton-badges"></span>     <!-- = 2 hàng badge -->
      <span class="skeleton-item skeleton-link"></span>       <!-- = footer link -->
    </li>
    … (4 thẻ li, bằng số project thật)
  </ul>

  <!-- T-03B: success. Rỗng trong HTML, JS điền từ template -->
  <ul class="project-grid" data-active-filter="all"></ul>

  <template id="project-card-template">
    <li>
      <article class="project-card" data-category="">
        <header class="card-header">
          <h3></h3>
          <span class="badge badge-category"></span>
        </header>
        <p class="card-description"></p>
        <ul class="badge-list" aria-label="Tech stack"></ul>
        <footer class="card-footer"></footer>
      </article>
    </li>
  </template>

  <!-- T-03C: empty & error, xem ngay dưới -->
</section>
```

Panel empty/error là **`<p>`**, không dùng `<div>` (Ex1: 0 div), không dùng `<section>` (section con phải có heading) hay `<aside>` (không phải nội dung phụ). Nút Retry nằm trong `<p>` là hợp lệ (phrasing content):

```html
  <!-- T-03C: empty -->
  <p class="feed-panel feed-empty">
    No projects to show yet.
    <a href="https://github.com/Prosperum26">See my work on GitHub</a>
  </p>

  <!-- T-03C: error -->
  <p class="feed-panel feed-error">
    <span class="feed-error-message" role="alert"></span>
    <button type="button" class="feed-retry">Retry</button>
    <a href="https://github.com/Prosperum26">See my work on GitHub</a>
  </p>

  <!-- Tắt JS -->
  <noscript>
    <p class="feed-panel">
      Projects load with JavaScript.
      <a href="https://github.com/Prosperum26">Browse them on GitHub</a> instead.
    </p>
  </noscript>
```

| Quy tắc | Lý do |
|---|---|
| `data-state="loading"` + `aria-busy="true"` **có sẵn trong HTML** | Skeleton hiện ngay ở lần paint đầu, không chờ JS → không có khung trống rồi nhảy |
| Skeleton `aria-hidden="true"` | Là hình trang trí; screen reader nghe `.feed-status` "Loading projects…" thay vì 20 thẻ span rỗng |
| `aria-busy` trên section (Errata slide 18) | Báo AT rằng vùng đang cập nhật; tắt về `false` ở cả 3 state kết thúc |
| Số skeleton card = 4, cấu trúc giống card thật (header, 5 dòng mô tả, 2 hàng badge, footer) | Đo ở 375px: card thật 326–377px (mô tả 4–6 dòng). Skeleton phải nằm trong khoảng này → gần như không shift khi đổi state |
| `<template>` thay vì chuỗi HTML trong JS | Markup và class nằm trong HTML (contract), JS không cần `innerHTML` |
| `h2` có `tabindex="-1"` | Đích focus sau khi bấm Retry (nút Retry biến mất khi về `loading`, nếu không focus sẽ rơi về `<body>`) |
| `.feed-error-message` rỗng trong HTML, JS ghi text khi vào `error` | `role="alert"` chỉ đọc khi nội dung **thay đổi**; ghi text sau khi panel đã hiện thì mới được đọc |
| Link `https://github.com/Prosperum26` | Đã dùng trong card Ex3, là tài khoản thật. Empty/error/no-JS đều có lối thoát |
| `.visually-hidden` | Thêm vào `layout.css` nếu Ex3 chưa có (kiểm tra trước, không tạo trùng) |

### 3.4 Bảng hiển thị theo state (CSS đọc `[data-state]`)

| Khối | `loading` | `success` | `empty` | `error` |
|---|---|---|---|---|
| `.skeleton-list` | ✔ | — | — | — |
| `.filter-bar`, `.filter-status` | `visibility: hidden` (giữ chỗ) | ✔ | — | — |
| `.project-grid` | — | ✔ | — | — |
| `.feed-empty` | — | — | ✔ | — |
| `.feed-error` | — | — | — | ✔ |

- Mỗi file CSS chỉ chứa rule hiển thị cho **khối của nó**: `skeleton.css` lo `.skeleton-list`, `project-card.css` lo grid + filter bar, `feed-state.css` lo 2 panel.
- Ẩn bằng `display: none` (khối biến mất khỏi cả accessibility tree), riêng filter bar ở `loading` dùng `visibility: hidden` để giữ chỗ, tránh shift khi chuyển sang `success`.
- `noscript.css`: `.skeleton-list, .filter-bar, .filter-status { display: none; }`.

### 3.5 T-03A Skeleton: token & CSS

**Errata cho mẫu `skeleton.css` trên slide** (không copy nguyên văn):

| Lỗi trong mẫu | Hậu quả | Cách làm đúng |
|---|---|---|
| `background-size` và `animation` nằm **ngoài** dấu `}` của `.skeleton-item` | CSS không hợp lệ: 2 dòng này bị bỏ qua → **không có shimmer** | Đưa vào trong rule |
| Hex `#1e293b`, `#334155` trong rule | Vi phạm §4 (0 hex ngoài `:root`), không đổi theo theme | Token `--color-skeleton-base`/`-highlight` |
| `animation: … infinite`, không có reduced-motion | Vi phạm §4, WCAG 2.3.3 | Chỉ chạy shimmer trong `@media (prefers-reduced-motion: no-preference)` |
| `height: 48px` cho mọi dòng | Không giống card thật → shift lớn khi đổi state | Chiều cao theo `--line-height` và cỡ chữ của card |
| Không có `aria-busy` | AT không biết vùng đang tải | `aria-busy` trên section (3.3) |

**Token mới (thêm vào `tokens.css`, chỉ thêm, không sửa token cũ):**

| Token | Light | Dark |
|---|---|---|
| `--palette-slate-200` | `#e2e8f0` | — |
| `--palette-slate-700` | `#334155` | — |
| `--color-skeleton-base` | slate-200 | slate-800 |
| `--color-skeleton-highlight` | slate-50 | slate-700 |
| `--skeleton-duration` | `1.5s` | — |

> Dark mapping thêm ở **cả hai** nơi như Ex3: `@media (prefers-color-scheme: dark) :root:not(.light-theme)` và `:root.dark-theme`.
> Skeleton là hình trang trí (`aria-hidden`), không thuộc WCAG 1.4.3/1.4.11 nên không cần tỉ lệ contrast. Chỉ cần nhìn thấy được trên `--color-surface`.

**Rule chuẩn (dạng sửa của slide):**

```css
.skeleton-item {
  display: block;
  height: calc(var(--font-size-base) * var(--line-height));
  border-radius: var(--radius);
  background: linear-gradient(90deg,
    var(--color-skeleton-base) 25%,
    var(--color-skeleton-highlight) 50%,
    var(--color-skeleton-base) 75%);
  background-size: 200% 100%;
}

@media (prefers-reduced-motion: no-preference) {
  .skeleton-item { animation: shimmer var(--skeleton-duration) linear infinite; }
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

- `.skeleton-card` dùng lại khung của `.project-card` (padding, border, radius, `--color-surface`) và nằm trong grid giống `.project-grid` → 2 khối có cùng kích thước cột.
- Animate `background-position` gây repaint mỗi frame. Chấp nhận vì chỉ có 4 card và chỉ chạy trong `loading`; nếu Performance panel thấy jank thì đổi sang `transform` trên `::after` (ghi ở mục 8).

### 3.6 T-03B → T-03D: controller `project-feed.js`

**Cấu hình nằm ở 1 chỗ (đầu file):**

```js
const STATES = ['loading', 'success', 'empty', 'error'];
const DATA_SOURCES = {
  default:   'data/projects.json',
  empty:     'data/projects-empty.json',
  malformed: 'data/projects-malformed.json',
  error:     'data/does-not-exist.json',   // 404 thật từ Live Server
};
const FETCH_TIMEOUT_MS = 8000;
```

- Chọn nguồn bằng `new URLSearchParams(location.search).get('demo')`; giá trị lạ → `default`. Mỗi state đều ép được để chụp screenshot, **không có lỗi giả lập bằng `setTimeout`**.
- State `loading` chụp bằng DevTools → Network → *Slow 3G* (độ trễ thật, không thêm delay nhân tạo).

**Cấu trúc JSON (`data/projects.json`):**

```json
{
  "projects": [
    {
      "id": "greengrass",
      "title": "GreenGrass",
      "category": "backend",
      "categoryLabel": "Backend",
      "description": "A green event platform for VNU-HCM students, …",
      "stack": ["NestJS", "React", "PostgreSQL", "Prisma", "Docker"],
      "links": [
        { "label": "Backend source",  "url": "https://github.com/Prosperum26/greengrass-backend" },
        { "label": "Frontend source", "url": "https://github.com/Prosperum26/greengrass-frontend" }
      ]
    }
  ]
}
```

- 4 object, nội dung copy **nguyên văn** từ card Ex3 (GreenGrass, Diabetes Q&A Assistant, RL Dynamic Pricing, Chuck King).
- Top-level là object `{ projects: [...] }` chứ không phải mảng trần: thêm field sau này (vd `updatedAt`) không phá format.

**Kiểm tra dữ liệu (`isValidProject`) — không tin dữ liệu ngoài:**

| Field | Điều kiện | Lý do |
|---|---|---|
| `id` | khớp `/^[a-z0-9-]+$/` | Dùng làm `id="project-<id>"` cho `aria-labelledby` |
| `category` | khớp 1 `data-filter` có trong DOM (trừ `all`) | Bộ lọc không bị "mồ côi" |
| `title`, `categoryLabel`, `description` | string không rỗng | |
| `stack` | mảng string | |
| `links[].url` | `new URL(url).protocol === 'https:'` | Chặn `javascript:` URL (XSS qua `href`) |

- Item không hợp lệ bị **bỏ qua**, item hợp lệ vẫn render (hiển thị được phần đúng còn hơn báo lỗi cả khối).
- `projects` có phần tử nhưng 0 item hợp lệ → `error` (kind `format`).

**Render (T-03B-J):** clone `#project-card-template`, điền bằng `textContent`:

- `article.dataset.category = p.category`; `h3.id = 'project-' + p.id`; `article.setAttribute('aria-labelledby', h3.id)`.
- Mỗi `stack` → `<li class="badge">` tạo bằng `document.createElement`.
- Mỗi link → `<a href>`; `aria-label = \`${label} of ${title} on GitHub\`` (chỉ thêm "on GitHub" khi `hostname === 'github.com'`). Bắt đầu bằng text hiển thị → đạt WCAG 2.5.3 như Ex3.
- Gom vào `DocumentFragment` rồi `grid.replaceChildren(fragment)` 1 lần (1 lần layout, xoá luôn card cũ khi retry).
- Sau khi render: `setState('success')` rồi `section.dispatchEvent(new CustomEvent('projects:rendered'))`.

**Phân loại lỗi (T-03C-J2), 1 khối `try/catch`:**

| Kind | Phát hiện | Thông báo (ghi vào `.feed-error-message`) |
|---|---|---|
| `timeout` | `fetch()` hoặc `response.json()` bị signal huỷ: `error.name === 'TimeoutError'` | "Loading projects took too long." |
| `network` | `fetch()` reject (không có response), hoặc body bị đứt khi đang đọc | "Couldn't reach the server. Check your connection." |
| `http` | `!response.ok` | "The project list is unavailable right now (error <status>)." |
| `format` | `response.json()` ném `SyntaxError`, hoặc thiếu `projects` / không phải mảng / 0 item hợp lệ | "The project list couldn't be read." |

- **Gắn kind ngay tại chỗ phát sinh** (`request()`, `readJson()`, validate). Lỗi không có kind là bug trong code (vd `TypeError` lúc render) → hiển thị như `format`, không đổ cho mạng của người dùng.
- Lối thoát nằm sẵn trong HTML: nút Retry + link GitHub cạnh nó (3.3). JS chỉ ghi câu mô tả lỗi.
- **Không** in `error.message` gốc ra giao diện (lộ chi tiết kỹ thuật); không `console.error` (DoD: 0 lỗi console). Lưu ý: `?demo=error` vẫn có 1 dòng *GET … 404* do **trình duyệt** tự in ở Network/console — đây là hành vi đúng, ghi chú trong B13.
- `AbortSignal.timeout()`: kiểm tra MDN Baseline trước khi dùng (§2.4). Nếu chưa Widely available → `AbortController` + `setTimeout` + `clearTimeout` trong `finally`.

**Retry (T-03C-J2):**

```
click .feed-retry → nếu state !== 'error' thì return (chống double click)
                  → setState('loading'); heading.focus(); load()
```

### 3.7 T-03D Đồng bộ bộ lọc với dữ liệu động

`project-filter.js` của Ex3 đọc `items` **một lần lúc init**, lúc đó grid đang rỗng → bộ lọc không thấy card nào. Sửa tối thiểu:

| Thay đổi | Lý do |
|---|---|
| Query `items` **bên trong** `render()` thay vì lúc init | Card được thêm sau khi script chạy |
| Nghe `projects:rendered` trên `#projects` → `render()` | Đồng bộ status "Showing n of m" và `hidden` với filter đang chọn (giữ filter cũ sau Retry) |
| Không import/gọi hàm của `project-feed.js` | 2 file chỉ giao tiếp qua 1 CustomEvent → bỏ 1 file thì file kia vẫn không lỗi |

---

## 4. Sub-tasks

| ID | Sub-task | File được chạm | Output | Phụ thuộc |
|---|---|---|---|---|
| T-04-0H | Baseline HTML | `index.html` | Copy Ex3, chạy được trong `Exercise_4/` | — |
| T-04-0C | Baseline CSS | `css/**` | Copy Ex3 nguyên trạng | T-04-0H |
| T-04-0J | Baseline JS | `js/theme.js`, `js/contact-form.js`, `js/project-filter.js` | Copy Ex3 nguyên trạng | T-04-0H |
| T-04-0A | Baseline asset | `assets/*` | Copy 6 file avatar | — |
| **T-03A-H** | Loading markup | `index.html` | Section có `data-state`/`aria-busy`, skeleton list, `.feed-status`, link CSS/JS mới, `noscript` | T-04-0H |
| **T-03A-C** | Skeleton style | `tokens.css`, `components/skeleton.css`, `noscript.css` | Token skeleton, shimmer, reduced-motion, rule hiển thị `loading` | T-03A-H |
| **T-03A-J** | Controller: loading | `js/project-feed.js` | `STATES`, `setState`, `DATA_SOURCES`, `load()` gọi `fetch` (chưa xử lý kết quả) | T-03A-H |
| **T-03B-D** | Dữ liệu thật | `data/projects.json` | 4 project copy từ Ex3 | — |
| **T-03B-H** | Template | `index.html` | Xoá 4 card tĩnh, thêm `<template>`, grid rỗng | T-03A-H |
| **T-03B-C** | Live data style | `components/project-card.css` | Rule hiển thị `success`, filter bar `visibility` ở loading, `.card-description` | T-03B-H |
| **T-03B-J** | Controller: success | `js/project-feed.js` | `isValidProject`, render từ template, event `projects:rendered` | T-03A-J, T-03B-D |
| **T-03C-D** | Fixture | `data/projects-empty.json`, `data/projects-malformed.json` | 2 file demo | — |
| **T-03C-H** | Empty & error markup | `index.html` | 2 panel, nút Retry, link GitHub | T-03A-H |
| **T-03C-C** | Empty & error style | `components/feed-state.css` | Panel, nút Retry ≥ 44px, `--color-danger`, rule hiển thị | T-03C-H |
| **T-03C-J1** | Controller: empty | `js/project-feed.js` | Nhánh `projects.length === 0` | T-03B-J |
| **T-03C-J2** | Controller: error + retry | `js/project-feed.js` | `try/catch`, timeout, 4 kind lỗi, Retry + focus, `requestId` | T-03C-J1 |
| **T-03D-J** | Filter sync | `js/project-filter.js` | Items động, nghe `projects:rendered` | T-03B-J |
| T-03E | Audit tổng | Chỉ đọc | Danh sách lỗi theo ma trận mục 5 (chưa sửa) | Tất cả |

### Kế hoạch prompt (mỗi dòng = 1 phiên prompt riêng)

Mọi prompt mở đầu: *"Đọc project-rules.md (đính kèm) trước khi đề xuất code. Chỉ làm task `<ID>`, chỉ sửa file `<file>`. Chỉ làm state `<state>`, KHÔNG viết code cho các state khác."*

- **T-03A-H:** "Sửa `section#projects` theo markup 3.3 phần loading (skeleton + feed-status). Chưa thêm template, panel empty/error."
- **T-03A-C:** "Viết `skeleton.css` theo rule chuẩn 3.5. Mẫu slide có 3 lỗi (liệt kê ở 3.5), không lặp lại. Chỉ dùng token trong `tokens.css` (dán danh sách)."
- **T-03A-J:** "Giải thích bằng lời hàm `setState` và `load()` theo state machine 3.1, **chưa viết code**." → duyệt → "Viết phần loading của `project-feed.js`. `load()` chỉ `fetch` và `await response.json()`, chưa rẽ nhánh."
- **T-03B-J:** "Thêm validate (bảng 3.6) và render từ `<template>`. Chỉ `textContent`/`createElement`, không `innerHTML`. Chỉ xử lý nhánh có dữ liệu."
- **T-03C-J1:** "Thêm nhánh `empty`. Không đụng code của nhánh success."
- **T-03C-J2:** "Liệt kê 4 kind lỗi và test case cho từng kind, **chưa viết code**." → duyệt → "Bọc `load()` trong `try/catch` theo bảng 3.6, thêm Retry. Không in `error.message` ra UI."
- **T-03D-J:** "Sửa `project-filter.js` tối thiểu theo 3.7. Không gọi trực tiếp hàm nào của `project-feed.js`."
- **T-03E (review):** "Audit `Exercise_4/` theo ma trận mục 5. **Chỉ liệt kê lỗi, chưa sửa.**"

---

## 5. Strict Acceptance Criteria Matrix

| # | Tiêu chí | Cách kiểm tra | Task |
|---|---|---|---|
| C1 | Mỗi commit 1 loại file, mỗi state commit riêng | `git log --stat --oneline -- Exercise_4` | Tất cả |
| C2 | 0 hex/rgb ngoài khối primitive | `grep -rnE "#[0-9a-fA-F]{3,8}\b\|rgb\(" Exercise_4/css/layout.css Exercise_4/css/components/ Exercise_4/css/noscript.css` → rỗng | *C |
| C3 | Không có token "ma" | So `grep -ohr "var(--[a-z0-9-]*" Exercise_4/css \| sort -u` với `--*` khai báo trong `tokens.css` | *C |
| C4 | **Loading**: skeleton hiện, shimmer chạy | Network *Slow 3G* + reload → thấy 4 skeleton card có shimmer, `#projects[data-state="loading"][aria-busy="true"]` | T-03A |
| C5 | Reduced motion | DevTools › Rendering › *prefers-reduced-motion: reduce* → skeleton đứng yên | T-03A-C |
| C6 | Skeleton đổi theo theme | Toggle dark/light ở state loading → màu skeleton đổi, vẫn thấy trên nền | T-03A-C |
| C7 | **Success**: render đúng dữ liệu | 4 card, nội dung trùng Ex3; mỗi card có `aria-labelledby` trỏ tới `h3` tồn tại; `aria-busy="false"` | T-03B |
| C8 | Không `innerHTML`, chặn URL xấu | Sửa tạm 1 `url` thành `javascript:alert(1)` → link đó không render, card còn lại vẫn hiện | T-03B-J |
| C9 | Badge Flex, list Grid, 375px không cuộn ngang | Device 375×667 → `document.documentElement.scrollWidth <= innerWidth` → `true`; badge xuống dòng | T-03B-C |
| C10 | Bộ lọc chạy với dữ liệu động | All 4 / Backend 1 / AI 2 / Frontend 1; status đổi đúng | T-03D-J |
| C11 | **Empty** | `?demo=empty` → panel empty, link GitHub focus được; không skeleton, không filter bar | T-03C |
| C12 | **Error** + thông báo được đọc | `?demo=error` → panel error, text "…error 404…"; NVDA/Narrator đọc ngay (role alert) | T-03C |
| C13 | Error do dữ liệu hỏng | `?demo=malformed` → error kind `format`; console chỉ có (tối đa) dòng 404 do trình duyệt in ở `?demo=error`, **không** có lỗi JS | T-03C-J2 |
| C14 | Error do mất mạng | Network › *Offline* → reload phần data (hoặc bấm Retry) → kind `network` | T-03C-J2 |
| C15 | Retry đúng | Ở `?demo=error`: bấm Retry → về `loading` (thấy skeleton), focus ở "Projects", rồi lại `error`. Bỏ `?demo` trong DevTools Override hoặc tắt *Offline* → Retry → `success` | T-03C-J2 |
| C16 | Retry bằng bàn phím, ≥ 44px | Tab tới Retry, `Enter`/`Space` đều chạy; vùng chạm ≥ 44×44 | T-03C |
| C17 | State có 1 nguồn | Ở mọi thời điểm: chỉ đúng 1 khối trong bảng 3.4 hiển thị; `data-state` ∈ 4 giá trị | Tất cả |
| C18 | Tắt JS | Disable JavaScript → không skeleton, không filter bar, thấy đoạn noscript + link GitHub | T-03A-H/C |
| C19 | Contrast ≥ 4.5:1 cả 2 theme | Lighthouse Accessibility ở light/dark, ở cả state success, empty, error | *C |
| C20 | Performance | Fast 3G + Disable cache → LCP < 2000 ms (LCP vẫn là avatar hero), CLS ≤ 0.02 | T-03E |
| C21 | Grep sạch theo DoD | `grep -rnE "var \|innerHTML\|onclick=\|keyCode\|keypress\|style=\"\|https://cdn" Exercise_4/` → rỗng | T-03E |

---

## 6. Live Defense runbook

| Yêu cầu của giảng viên | Chỗ sửa | Số dòng |
|---|---|---|
| Đổi thời gian timeout | `FETCH_TIMEOUT_MS` | 1 |
| Đổi tốc độ shimmer | `--skeleton-duration` trong `tokens.css` | 1 |
| Đổi màu skeleton | 2 dòng mapping `--color-skeleton-*` | 2 |
| Thêm state demo mới (vd `?demo=slow`) | 1 entry trong `DATA_SOURCES` + 1 file JSON | 1 + file |
| Thêm 1 project | 1 object trong `projects.json` (+ 1 skeleton `<li>` nếu muốn khớp số) | ~10 |
| Thêm field "year" làm badge | `<span class="badge">` trong template + 1 dòng `textContent` + 1 dòng validate | 3 |
| Đổi `data-state` → `data-status` | `setState` (1 chỗ) + selector trong 3 file CSS (search/replace) | ~6 |
| Chuyển sang GitHub API thật | Đổi `DATA_SOURCES.default` + hàm map field API → schema 3.6 | ~10 |
| "Bấm Retry 5 lần liên tục thì sao?" | Đã chặn: nút chỉ hoạt động khi `state === 'error'`, `requestId` bỏ response cũ | 0 |

---

## 7. Kế hoạch commit (mỗi state commit riêng, theo luật của đề)

| # | Commit message | File |
|---|---|---|
| 1 | `docs(spec): exercise 4 resilient component state machine` | file này |
| 2 | `chore(html): exercise 4 baseline from exercise 3` | `index.html` |
| 3 | `chore(css): exercise 4 baseline styles` | `css/**` |
| 4 | `chore(js): exercise 4 baseline scripts` | `js/*.js` (3 file copy) |
| 5 | `chore(assets): exercise 4 hero avatar` | `assets/*` |
| **State 1 – loading** | | |
| 6 | `feat(html): loading skeleton markup` | T-03A-H |
| 7 | `feat(css): skeleton` | T-03A-C |
| 8 | `feat(js): feed controller loading state` | T-03A-J |
| **State 2 – success** | | |
| 9 | `chore(data): project list json` | T-03B-D |
| 10 | `feat(html): project card template` | T-03B-H |
| 11 | `feat(css): live data state` | T-03B-C |
| 12 | `feat(js): render live data state` | T-03B-J |
| 13 | `feat(js): sync project filter with live data` | T-03D-J |
| **State 3 & 4 – empty, error** | | |
| 14 | `chore(data): empty & malformed fixtures` | T-03C-D |
| 15 | `feat(html): empty & error panels` | T-03C-H |
| 16 | `feat(css): empty & error states` | T-03C-C |
| 17 | `feat(js): empty state` | T-03C-J1 |
| 18 | `feat(js): error state & accessible retry` | T-03C-J2 |
| 19+ | `fix(<type>): …` | Sau audit T-03E, mỗi commit 1 loại file |

> Commit 7 chạm 3 file CSS (`tokens.css`, `skeleton.css`, `noscript.css`): cùng 1 loại file, cùng 1 state.
> Giữa commit 10 và 12, section Projects không có card (đã xoá card tĩnh, chưa render). Chấp nhận vì đây là trạng thái trung gian trên nhánh bài lab.

---

## 8. Rủi ro & quyết định đã chốt

| Rủi ro | Quyết định | Lý do |
|---|---|---|
| Dữ liệu lấy từ GitHub API thật | **Không**, dùng JSON local | Rate limit 60 req/h không token; mạng phòng vấn đáp không chắc; API không có mô tả/stack như card. Runbook mục 6 có đường chuyển |
| Giả lập loading bằng `setTimeout` | **Không**, dùng DevTools throttling | Delay giả làm trang chậm thật với người dùng; throttling cho kết quả trung thực |
| Đổi skeleton → card gây layout shift | Skeleton cùng cấu trúc + cùng grid với card; đo ở T-03E | Ở 375px và desktop, Projects nằm dưới màn hình đầu: shift ngoài viewport không tính vào CLS. Shift trong 500ms sau click Retry được loại (`hadRecentInput`) |
| Skeleton quay mãi khi tắt JS | `noscript.css` ẩn skeleton, `noscript` hiện link GitHub | Progressive enhancement, không inline style |
| Animate `background-position` gây repaint | Chấp nhận (4 card, chỉ trong loading) | Fallback: `::after` + `transform: translateX()` nếu Performance thấy jank |
| `role="alert"` không đọc khi panel vừa hiện | Ghi text vào `.feed-error-message` **sau** `setState('error')` | Live region chỉ đọc khi nội dung thay đổi |
| Response cũ về muộn ghi đè state mới | `requestId` | Chống race khi Retry trên mạng chậm |
| Mất card tĩnh → SEO/no-JS kém hơn Ex3 | Chấp nhận, có link GitHub ở noscript | Mục tiêu bài là component dữ liệu động; Ex3 vẫn giữ bản tĩnh |
| 9 file CSS chặn render, ảnh hưởng LCP | Giữ tách file; đo C20 | Fallback giống Ex3: gộp `components/*.css` thành 1 file bằng `refactor(css)` |

---

## 9. Prompt log & bằng chứng

| Task | Link prompt | Screenshot | AI sai gì / mình sửa gì |
|---|---|---|---|
| T-03A | _(dán link share)_ | `screenshots/ex4-loading-slow3g.png`, `ex4-loading-reduced-motion.png` | |
| T-03B | _(dán link share)_ | `screenshots/ex4-success-375.png`, `ex4-success-desktop.png` | |
| T-03C empty | _(dán link share)_ | `screenshots/ex4-empty.png` | |
| T-03C error | _(dán link share)_ | `screenshots/ex4-error-404.png`, `ex4-error-offline.png`, `ex4-error-a11y-alert.png` | |
| T-03D | _(dán link share)_ | `screenshots/ex4-filter-ai.png` | |
| T-03E | _(dán link share)_ | `screenshots/ex4-lighthouse.png`, `ex4-perf-fast3g.png` | |
