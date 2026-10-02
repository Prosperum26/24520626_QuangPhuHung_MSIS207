# TASK_DECOMPOSITION – Exercise 3 (Elevated): Component Architecture & State Modeling

> Work Breakdown Structure (WBS) cho Exercise 3.
> Tài liệu này được viết và commit **trước** khi prompt AI sinh code (`docs(spec)` đi trước mọi commit code).
> Mọi prompt AI đều tham chiếu đúng **1** task ID dưới đây và đính kèm `project-rules.md` + phần contract liên quan.

---

## 1. Mục tiêu bài

Tách trang portfolio của Exercise 2 thành **5 component độc lập**, mỗi component có contract HTML/CSS/JS riêng và trạng thái (state) được mô hình hoá tường minh trên DOM:

| ID | Component | Yêu cầu của đề (slide 14) | State |
|---|---|---|---|
| T-03-1 | Hero Section | Ảnh độ phân giải cao có kích thước tường minh, headline, pitch | — (tĩnh) |
| T-03-2 | Theme Switcher | Nút accessible có `aria-pressed` và icon đổi theo trạng thái | `aria-pressed` = `true`\|`false` |
| T-03-3 | Skills Matrix | Badge phân nhóm, sắp bằng CSS Grid | — (tĩnh) |
| T-03-4 | Project Cards | `<article>` tự chứa: tag, link, mô tả | `data-active-filter` = `all`\|`backend`\|`ai`\|`frontend` |
| T-03-5 | Contact Form | Form native có validation và xử lý state phía client | `data-state` = `idle`\|`invalid`\|`submitting`\|`success`\|`error` |

**Nguyên tắc state modeling (bất biến cho cả bài):**

1. **State nằm trên DOM:** chỉ ở `data-*` hoặc `aria-*`. Không dùng biến boolean rời rạc (`isOpen`, `isLoading`…).
2. **JS chỉ ghi attribute, CSS chỉ đọc attribute.** Ví dụ: `[aria-pressed="true"] .theme-icon-moon`, `[data-state="submitting"]`, `[aria-invalid="true"]`. JS không tự đặt `style`.
3. **1 component = 1 file CSS (+ 1 file JS nếu có hành vi).** Mỗi component chỉ dùng token đã khai báo trong `tokens.css`.
4. **Progressive enhancement:** khi không có JS, trang vẫn đọc được và form vẫn gửi được (native `mailto:`).

**Ngoài phạm vi:** fetch dữ liệu từ xa, skeleton/loading (để Exercise 4), animation phức tạp.

> Quy ước ID: slide Exercise 4 dùng `T-03A…T-03D`. Để tránh trùng, Exercise 3 dùng `T-03-<số><loại>` (ví dụ `T-03-4J`), còn Exercise 4 sẽ dùng `T-04A…`.
> Hậu tố loại: `H` = HTML, `C` = CSS, `J` = JS, `A` = asset.

---

## 2. Quy trình 4 bước áp dụng

| Bước | Áp dụng trong bài |
|---|---|
| 1. Functional Slicing | Chia theo **component**, rồi trong mỗi component chia tiếp theo **loại file** (H → C → J). Mỗi sub-task chỉ chạm 1 file |
| 2. Contract Definition | Chốt trước markup, class, `data-*`, state machine và token cho từng component (mục 3) |
| 3. Atomic Generation | 1 prompt = 1 task ID. Chỉ đính kèm contract của component đó và file đích |
| 4. Contract Verification | Mỗi component có cổng kiểm tra riêng (mục 5). Pass mới commit và sang component tiếp |

---

## 3. Contract (chốt trước khi viết code)

### 3.1 Cấu trúc file & thứ tự nạp

```
Exercise_3/
├── index.html                      ← copy từ Exercise_2, sửa theo từng component
├── assets/
│   ├── hero-avatar-320.avif|webp|jpg   ← T-03-0A
│   └── hero-avatar-640.avif|webp|jpg
├── css/
│   ├── tokens.css                  ← copy Ex2 + token mới (T-03-0C)
│   ├── layout.css                  ← khung trang: frame, nav, timeline, footer, badge dùng chung
│   └── components/
│       ├── hero.css                ← T-03-1C
│       ├── theme-switcher.css      ← T-03-2C
│       ├── skills-matrix.css       ← T-03-3C
│       ├── project-card.css        ← T-03-4C
│       └── contact-form.css        ← T-03-5C
└── js/
    ├── theme.js                    ← copy Ex2, KHÔNG sửa (icon đổi bằng CSS)
    ├── project-filter.js           ← T-03-4J
    └── contact-form.js             ← T-03-5J
```

Thứ tự trong `<head>`:

```html
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/components/hero.css">
<link rel="stylesheet" href="css/components/theme-switcher.css">
<link rel="stylesheet" href="css/components/skills-matrix.css">
<link rel="stylesheet" href="css/components/project-card.css">
<link rel="stylesheet" href="css/components/contact-form.css">
<script src="js/theme.js" defer></script>
<script src="js/project-filter.js" defer></script>
<script src="js/contact-form.js" defer></script>
```

- Mỗi file JS là 1 script `defer` độc lập: tự `querySelector` root của component, **thoát sớm nếu không tìm thấy** (`if (!root) return;` bọc trong hàm `init`). Không có biến global dùng chung giữa các file.
- Cách nạp 7 file CSS là rủi ro cho LCP vì HTTP/1.1 chỉ mở 6 kết nối/host. Xem mục 8.

### 3.2 Token mới (T-03-0C, chỉ thêm, không sửa token của Ex2)

**Primitive mới** (thêm vào khối `--palette-*`):

| Token | Giá trị |
|---|---|
| `--palette-red-300` | `#fca5a5` |
| `--palette-red-700` | `#b91c1c` |
| `--palette-green-300` | `#86efac` |
| `--palette-green-700` | `#15803d` |

**Semantic mới:**

| Semantic token | Light | Dark | Dùng cho |
|---|---|---|---|
| `--color-danger` | red-700 | red-300 | lỗi field, viền `[aria-invalid="true"]`, status error |
| `--color-success` | green-700 | green-300 | status success |

**Contrast đã tính (WCAG 2.2 AA, chữ thường ≥ 4.5:1):**

| Cặp (fg / bg) | Light | Dark |
|---|---|---|
| danger / bg | 6.47 | 9.41 |
| danger / surface | 5.91 | 7.71 |
| success / bg | 5.02 | 12.71 |
| success / surface | 4.58 ⚠ sát ngưỡng | 10.42 |

> `--color-success` chỉ đặt trên `--color-bg` (form nằm trên nền trang, không nằm trong card).
> Khối dark mapping phải được thêm ở **cả hai** nơi: `@media (prefers-color-scheme: dark) :root:not(.light-theme)` và `:root.dark-theme` (cascade Ex2 §3.3).

**Token không phải màu:**

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--font-size-sm` | 0.875rem | hint, lỗi field, status |
| `--avatar-size` | 10rem (≥ 48rem: 14rem, override trong `hero.css` bằng `@media`) | ảnh hero |
| `--icon-size` | 1.25rem | icon theme switcher |

### 3.3 T-03-1 Hero Section

**Ảnh:** dùng ảnh minh hoạ `BabyLeopard.png` (1024×1024, RGBA, 2.5 MB). Đây không phải ảnh chân dung.

- Tên file là "Leopard" nhưng thực tế ảnh là **báo săn con (cheetah cub)**: có vệt đen chạy từ mắt xuống miệng và bờm lông xám trên lưng. Alt phải ghi đúng là *cheetah* (bài học F-02: alt không được bịa).
- Ảnh có watermark ✦ ở góc dưới phải, cho thấy đây là ảnh do AI tạo. Khi crop hình tròn (`border-radius: 50%`), góc này bị che: khoảng cách từ tâm tới watermark khoảng 640px, lớn hơn bán kính 512px. Khi vấn đáp, nói rõ đây là ảnh minh hoạ do AI tạo.
- **File gốc PNG không commit.** Chỉ commit 6 file đã xuất.

**T-03-0A – Xuất asset (Pillow, chạy ngoài repo):**

```python
from PIL import Image
src = Image.open(r"C:\Users\Phu Hung\Pictures\BabyLeopard.png").convert("RGB")  # bỏ alpha cho JPG
for w in (320, 640):
    im = src.resize((w, w), Image.LANCZOS)
    im.save(f"Exercise_3/assets/hero-avatar-{w}.avif", quality=50)
    im.save(f"Exercise_3/assets/hero-avatar-{w}.webp", quality=75)
    im.save(f"Exercise_3/assets/hero-avatar-{w}.jpg", quality=80, optimize=True, progressive=True)
```

| File | Ngân sách |
|---|---|
| `hero-avatar-320.avif` | ≤ 15 KB |
| `hero-avatar-640.avif` | ≤ 40 KB |
| `hero-avatar-320.jpg` (fallback) | ≤ 35 KB |

**Markup (`body > header.hero`, vẫn là landmark banner duy nhất):**

```html
<header class="hero">
  <picture class="hero-portrait">
    <source type="image/avif"
            srcset="assets/hero-avatar-320.avif 320w, assets/hero-avatar-640.avif 640w"
            sizes="(min-width: 48rem) 14rem, 10rem">
    <source type="image/webp"
            srcset="assets/hero-avatar-320.webp 320w, assets/hero-avatar-640.webp 640w"
            sizes="(min-width: 48rem) 14rem, 10rem">
    <img src="assets/hero-avatar-320.jpg"
         srcset="assets/hero-avatar-320.jpg 320w, assets/hero-avatar-640.jpg 640w"
         sizes="(min-width: 48rem) 14rem, 10rem"
         width="320" height="320"
         alt="Avatar: a cheetah cub looking up in golden grass"
         fetchpriority="high" decoding="async">
  </picture>
  <h1 class="hero-title"><span lang="vi">Quảng Phú Hưng</span> &mdash; Backend &amp; AI Developer</h1>
  <p class="hero-pitch">Building high-performance full-stack systems with a focus on backend and AI.</p>
  <!-- T-03-2: button#theme-toggle -->
</header>
```

| Quy tắc | Lý do |
|---|---|
| `width`/`height` = 320 trên `<img>`, CSS đặt `width: var(--avatar-size); height: auto` | Trình duyệt giữ chỗ theo tỉ lệ 1:1 từ trước khi ảnh tải xong → **CLS = 0** |
| **Không** `loading="lazy"`, có `fetchpriority="high"` | Ảnh nằm trong màn hình đầu, có thể là phần tử LCP (Errata slide 9) |
| `sizes` khớp `--avatar-size` | Mobile DPR 2: 160px × 2 → tải bản 320. Desktop DPR 2: 224 × 2 → tải bản 640 |
| `object-fit: cover; border-radius: 50%` | Crop tròn, đồng thời che watermark |

**Layout (`hero.css`):** Grid.

```
mobile (< 48rem)          ≥ 48rem
"avatar toggle"           "avatar title  toggle"
"title  title"            "avatar pitch  pitch"
"pitch  pitch"
```

### 3.4 T-03-2 Theme Switcher

Giữ nguyên **toàn bộ** theme contract của Ex2 (§3.3): key `theme`, class `.dark-theme`/`.light-theme`, `id="theme-toggle"`. Chỉ thêm icon.

```html
<button type="button" id="theme-toggle" class="theme-switcher" aria-pressed="false">
  <svg class="theme-icon theme-icon-sun" aria-hidden="true" focusable="false"
       width="20" height="20" viewBox="0 0 24 24"> … stroke="currentColor" … </svg>
  <svg class="theme-icon theme-icon-moon" aria-hidden="true" focusable="false"
       width="20" height="20" viewBox="0 0 24 24"> … stroke="currentColor" … </svg>
  <span class="theme-switcher-label">Dark mode</span>
</button>
```

| Quy tắc | Lý do |
|---|---|
| Icon do CSS đổi: `[aria-pressed="true"] .theme-icon-sun { display: none }`, `[aria-pressed="false"] .theme-icon-moon { display: none }` | State có một nguồn duy nhất là `aria-pressed`, và `theme.js` đã ghi attribute này → **không phải sửa JS** |
| Icon là inline SVG viết tay, `stroke="currentColor"` | Màu icon đi theo token qua `color`, không có hex. Không thêm request, không cần icon font/CDN |
| `aria-hidden="true"` + `focusable="false"` trên SVG | Icon chỉ để trang trí; tên accessible vẫn là "Dark mode" (WCAG 2.5.3 Label in Name) |
| Nhãn cố định, 2 icon cùng `--icon-size` | Toggle không làm đổi kích thước nút → CLS = 0 |
| Vùng chạm ≥ 44×44px (`min-height: 2.75rem`) | WCAG 2.5.8 |

Ý nghĩa icon: **sun** = đang sáng, **moon** = đang tối (icon thể hiện trạng thái hiện tại, khớp với `aria-pressed`).

### 3.5 T-03-3 Skills Matrix

```html
<ul class="skill-grid">
  <li class="skill-group" data-category="ai">
    <h3>AI &amp; Machine Learning</h3>
    <ul class="badge-list">
      <li class="badge">PyTorch</li> …
    </ul>
  </li>
  …
</ul>
```

- `data-category` ∈ `ai | backend | frontend | languages | tools`. Mỗi giá trị khớp với 1 nhóm hiện có của Ex2.
- **Đổi tên `.tag-list` → `.badge-list`** và gắn `.badge` cho từng `<li>` (theo naming của slide). `.badge-list`/`.badge` là primitive **dùng chung** cho skills và project cards, nên đặt trong `layout.css`, không đặt trong file component.
- `skills-matrix.css`: `.skill-grid` dùng `grid-template-columns: repeat(auto-fit, minmax(min(var(--card-min), 100%), 1fr))`. Bên trong mỗi nhóm, badge xếp bằng flex wrap.
- Không cần JS.

### 3.6 T-03-4 Project Cards + bộ lọc

**Card** (theo slide 14 nhưng sửa Errata: không `href="#"`, `aria-label` bắt đầu bằng text hiển thị):

```html
<li>
  <article class="project-card" data-category="backend" aria-labelledby="project-greengrass">
    <header class="card-header">
      <h3 id="project-greengrass">GreenGrass</h3>
      <span class="badge badge-category">Backend</span>
    </header>
    <p>…mô tả (giữ từ Ex2)…</p>
    <ul class="badge-list" aria-label="Tech stack">
      <li class="badge">NestJS</li> …
    </ul>
    <footer class="card-footer">
      <a href="https://github.com/Prosperum26/greengrass-backend"
         aria-label="Backend source of GreenGrass on GitHub">Backend source</a>
      …
    </footer>
  </article>
</li>
```

| Project | `data-category` | Badge |
|---|---|---|
| GreenGrass | `backend` | Backend |
| Diabetes Q&A Assistant | `ai` | AI |
| RL Dynamic Pricing | `ai` | AI |
| Chuck King | `frontend` | Frontend |

**Bộ lọc (phần "state modeling" của component này):**

```html
<ul class="filter-bar" aria-label="Filter projects by category">
  <li><button type="button" class="filter-button" data-filter="all" aria-pressed="true">All</button></li>
  <li><button type="button" class="filter-button" data-filter="backend" aria-pressed="false">Backend</button></li>
  <li><button type="button" class="filter-button" data-filter="ai" aria-pressed="false">AI</button></li>
  <li><button type="button" class="filter-button" data-filter="frontend" aria-pressed="false">Frontend</button></li>
</ul>
<p class="filter-status" role="status">Showing 4 of 4 projects</p>
<ul class="project-grid" data-active-filter="all"> … </ul>
```

**State machine `project-filter.js`:**

```
state:  grid.dataset.activeFilter ∈ {all, backend, ai, frontend}   ← nguồn sự thật duy nhất
click:  f = event.target.closest('.filter-button')?.dataset.filter
        nếu f không hợp lệ hoặc f === state → return
        grid.dataset.activeFilter = f; render()
render: với mỗi item của '.project-grid > li':
          item.hidden = !(f === 'all' || item.querySelector('.project-card').dataset.category === f)
        mỗi nút: aria-pressed = String(button.dataset.filter === f)
        status.textContent = n > 0 ? `Showing ${n} of ${total} projects`
                                   : 'No projects in this category yet.'
```

| Quy tắc | Lý do |
|---|---|
| Ẩn **`<li>`**, không ẩn `<article>` | Nếu chỉ ẩn article, `<li>` rỗng vẫn chiếm 1 ô grid |
| Dùng thuộc tính `hidden` | Phần tử bị gỡ khỏi cả giao diện lẫn accessibility tree. Không dùng class tự chế |
| Dùng **1** listener trên `.filter-bar` (event delegation) | Thêm category mới chỉ cần thêm 1 `<li><button>`, không phải sửa JS |
| Danh sách filter hợp lệ lấy từ các nút trong DOM, không hard-code trong JS | Khi vấn đáp, thêm/đổi category chỉ phải sửa HTML |
| Status `role="status"` có sẵn text trong HTML | Screen reader đọc kết quả lọc. Dòng text đã chiếm chỗ từ đầu nên không gây shift khi load |
| Filter bar hiển thị cả khi không có JS | Chấp nhận nút không hoạt động khi tắt JS. Nếu ẩn rồi hiện bằng JS thì gây CLS lúc load (mục 8) |

### 3.7 T-03-5 Contact Form (adapter `mailto:`)

**Markup** (đặt trong `section#contact`, sau `<address>`):

```html
<form class="contact-form" id="contact-form" data-state="idle"
      action="mailto:24520626@gm.uit.edu.vn" method="post" enctype="text/plain">
  <p class="form-field">
    <label for="contact-name">Name</label>
    <input id="contact-name" name="name" type="text" autocomplete="name"
           required minlength="2" maxlength="80" aria-describedby="contact-name-error">
    <span class="field-error" id="contact-name-error"></span>
  </p>
  <p class="form-field">
    <label for="contact-email">Email</label>
    <input id="contact-email" name="email" type="email" autocomplete="email"
           required maxlength="254" aria-describedby="contact-email-error">
    <span class="field-error" id="contact-email-error"></span>
  </p>
  <p class="form-field">
    <label for="contact-message">Message</label>
    <textarea id="contact-message" name="message" rows="5" required minlength="10" maxlength="500"
              aria-describedby="contact-message-hint contact-message-error"></textarea>
    <span class="field-hint" id="contact-message-hint">10–500 characters.</span>
    <span class="field-error" id="contact-message-error"></span>
  </p>
  <button type="submit" class="form-submit">Send message</button>
  <p class="form-status" id="contact-status" role="status"></p>
</form>
```

- **Không có JS:** native validation chạy, và `action="mailto:"` mở ứng dụng email. Form vẫn dùng được.
- **Có JS:** `form.noValidate = true` (đặt bằng JS, không đặt sẵn trong HTML). Từ đó JS hiển thị lỗi inline thay cho bubble mặc định của trình duyệt.

**State machine `contact-form.js`** (state ghi ở `form.dataset.state`):

```
            ┌──────────── submit ──────────────┐
idle ───────┤                                  │
invalid ────┤  validate all fields             │
success ────┤   ├─ có field lỗi → invalid      │
error ──────┘   │     (hiện lỗi, focus field lỗi đầu tiên)
                └─ hợp lệ → submitting (button.disabled = true)
                       buildMailto()
                         ├─ url.length > MAX_MAILTO_LENGTH  → error
                         ├─ ?form=fail trong URL trang (demo) → error
                         └─ window.location.href = url       → success
                       button.disabled = false
input / blur trên 1 field: chỉ validate lại field đó (nếu field đã được chạm, data-touched="true")
```

| Quy tắc | Chi tiết |
|---|---|
| Thông báo lỗi lấy từ `ValidityState` | Map cố định: `valueMissing`, `typeMismatch`, `tooShort`, `tooLong` → câu tiếng Anh. Ghi bằng `textContent`, không `innerHTML` |
| Field lỗi | `aria-invalid="true"` + text trong `#…-error`. CSS tô viền bằng `[aria-invalid="true"]`, **không dùng** `:user-invalid` (chưa chắc đã Widely available, phải check MDN) |
| Chỗ cho dòng lỗi | `.field-error` luôn có trong DOM với `min-height` = 1 dòng (`calc(var(--font-size-sm) * var(--line-height))`). Hiện lỗi không đẩy layout → CLS = 0 |
| Mã hoá URL | `encodeURIComponent` cho `subject` và `body`. **Không** dùng `URLSearchParams`: nó mã hoá dấu cách thành `+`, và mail client sẽ hiển thị nguyên dấu `+` |
| Nội dung mailto | `subject = "Portfolio contact from <name>"`; `body = message + "\n\n— <name> <email>"` |
| `MAX_MAILTO_LENGTH = 2000` | Mail client có thể cắt URL dài. Tiếng Việt có dấu mã hoá thành 6–9 ký tự mỗi chữ, nên 500 ký tự vẫn có thể vượt ngưỡng. Khi vượt → state **error thật** |
| Status | success: `--color-success`, text *"Your email app should open with your message. If it doesn't, email me at 24520626@gm.uit.edu.vn."*. error: `--color-danger`, `#contact-status` chuyển `role="alert"`, text gợi ý rút ngắn tin nhắn hoặc gửi email trực tiếp. Không reset form ở cả 2 state, vì nếu mail client không mở thì người dùng mất nội dung |
| Chống double submit | `button.disabled = true` trong state `submitting` (`project-rules.md` §5) |
| Thông báo trung thực | Không bao giờ hiện "Message sent": trang không thể biết email đã thực sự được gửi hay chưa |

---

## 4. Sub-tasks

| ID | Sub-task | File được chạm | Input | Output | Phụ thuộc |
|---|---|---|---|---|---|
| T-03-0H | Baseline HTML | `index.html` | Copy `Exercise_2/index.html` | Trang Ex2 chạy được trong `Exercise_3/`, link CSS/JS theo mục 3.1 | — |
| T-03-0C | Baseline CSS + token mới | `css/tokens.css`, `css/layout.css` | Copy Ex2 + mục 3.2 | Token danger/success/sm/avatar/icon; `.tag-list` → `.badge-list` + `.badge` | T-03-0H |
| T-03-0J | Baseline JS | `js/theme.js` | Copy Ex2 nguyên trạng | — | T-03-0H |
| T-03-0A | Asset | `assets/*` | Script mục 3.3 | 6 file ảnh đạt ngân sách | — |
| T-03-1H | Hero markup | `index.html` | Mục 3.3 | `header.hero` + `<picture>` | T-03-0A |
| T-03-1C | Hero style | `css/components/hero.css` | Mục 3.3 | Grid areas, avatar tròn, `--avatar-size` | T-03-1H |
| T-03-2H | Switcher markup | `index.html` | Mục 3.4 | 2 SVG + label trong `#theme-toggle` | T-03-1H |
| T-03-2C | Switcher style | `css/components/theme-switcher.css` | Mục 3.4 | Đổi icon theo `aria-pressed` | T-03-2H |
| T-03-3H | Skills markup | `index.html` | Mục 3.5 | `data-category`, `.badge-list`, `.badge` | T-03-0C |
| T-03-3C | Skills style | `css/components/skills-matrix.css` | Mục 3.5 | Chuyển rule skill từ `layout.css` sang | T-03-3H |
| T-03-4H | Cards markup | `index.html` | Mục 3.6 | `card-header`/`card-footer`, `data-category`, filter bar, status | T-03-3H |
| T-03-4C | Cards style | `css/components/project-card.css` | Mục 3.6 | Chuyển rule card từ `layout.css` sang; style filter bar + `[aria-pressed]` | T-03-4H |
| T-03-4J | Filter engine | `js/project-filter.js` | Mục 3.6 state machine | Lọc qua `hidden`, `aria-pressed`, status | T-03-4H |
| T-03-5H | Form markup | `index.html` | Mục 3.7 | Form native đầy đủ label/hint/error | T-03-0C |
| T-03-5C | Form style | `css/components/contact-form.css` | Mục 3.7 | Field, `[aria-invalid]`, `[data-state]`, status | T-03-5H |
| T-03-5J | Form controller | `js/contact-form.js` | Mục 3.7 state machine | Validate, mailto adapter, 5 state | T-03-5H |
| T-03-6 | Audit tổng | Chỉ đọc | Toàn bộ `Exercise_3/` | Danh sách lỗi theo ma trận mục 5 (chưa sửa) | Tất cả |

### Kế hoạch prompt cho từng sub-task

Mọi prompt đều mở đầu bằng: *"Đọc project-rules.md (đính kèm) trước khi đề xuất code. Chỉ làm đúng task `<ID>`, chỉ sửa file `<file>`."*

- **T-03-1H:** "Thay header của `Exercise_3/index.html` bằng `header.hero` theo đúng markup ở contract 3.3. Không sửa alt, không thêm `loading="lazy"`. Chỉ HTML."
- **T-03-1C:** "Viết `css/components/hero.css` theo layout ở 3.3. Chỉ dùng token có trong `tokens.css` (dán danh sách). Mobile-first. Ảnh không được làm tràn ngang ở 375px."
- **T-03-2H / 2C:** "Thêm 2 icon SVG viết tay (sun, moon) vào `#theme-toggle` theo 3.4. Không đụng `theme.js`." / "Viết CSS đổi icon chỉ bằng selector `[aria-pressed]`."
- **T-03-3H / 3C:** "Gắn `data-category` và đổi sang `.badge-list`/`.badge` theo 3.5, giữ nguyên nội dung skill." / "Chuyển rule `.skill-grid`/`.skill-group` từ `layout.css` sang `skills-matrix.css`."
- **T-03-4H:** "Đổi 4 project card sang contract 3.6 (`card-header`, `card-footer`, `data-category`, badge category), thêm filter bar và status. Giữ nguyên mô tả và link thật."
- **T-03-4J:** "Trước tiên, giải thích state machine 3.6 bằng lời, **chưa viết code**." → duyệt → "Viết `js/project-filter.js` theo đúng state machine đó."
- **T-03-5H:** "Viết form theo markup 3.7. Mỗi input có `<label for>`, hint và error liên kết bằng `aria-describedby`."
- **T-03-5J:** "Liệt kê các transition của state machine 3.7 và test case cho từng transition, **chưa viết code**." → duyệt → "Viết `js/contact-form.js`. Dùng `encodeURIComponent`, không dùng `URLSearchParams`, không dùng `innerHTML`."
- **T-03-6 (review):** "Audit `Exercise_3/` theo ma trận mục 5. **Chỉ liệt kê lỗi, chưa sửa.**"

---

## 5. Strict Acceptance Criteria Matrix

| # | Tiêu chí | Cách kiểm tra | Task |
|---|---|---|---|
| B1 | Không commit nào trộn 2 loại file code | `git log --stat --oneline -- Exercise_3` → mỗi commit chỉ chứa 1 trong `.html` / `.css` / `.js` | Tất cả |
| B2 | 0 hex/rgb ngoài khối primitive | `grep -rnE "#[0-9a-fA-F]{3,8}\b\|rgb\(" Exercise_3/css/layout.css Exercise_3/css/components/` → rỗng | *C |
| B3 | Không có token "ma" | So `grep -oh "var(--[a-z0-9-]*" Exercise_3/css -r \| sort -u` với danh sách `--*` trong `tokens.css` | *C |
| B4 | Ảnh hero không gây CLS và không lazy | Elements: `<img>` có `width`/`height`, không có `loading="lazy"`; Performance → *Layout Shifts* trống | T-03-1 |
| B5 | Ảnh đạt ngân sách và đúng định dạng | Network (lọc Img) trên Chrome → tải đúng 1 file `.avif` (320 trên mobile DPR 2) | T-03-0A, T-03-1H |
| B6 | Alt đúng sự thật | Đọc alt và so với ảnh: là *cheetah cub*, không phải "portrait" hay "leopard" | T-03-1H |
| B7 | Icon đổi theo state | Toggle → `aria-pressed="true"` thì chỉ thấy moon; reload vẫn đúng; tắt key `theme` và emulate dark → icon moon | T-03-2 |
| B8 | Accessible name của switcher | DevTools › Accessibility: tên = "Dark mode", role `button`, pressed true/false; SVG không có trong a11y tree | T-03-2H |
| B9 | Filter đúng | Click từng filter → số card hiện khớp bảng 3.6 (All 4, Backend 1, AI 2, Frontend 1); `<li>` ẩn có `hidden`; status đổi text | T-03-4J |
| B10 | State filter có một nguồn | `document.querySelector('.project-grid').dataset.activeFilter` luôn khớp nút có `aria-pressed="true"` | T-03-4J |
| B11 | Link card không chết, đạt Label in Name | `grep -n 'href="#"' Exercise_3/index.html` → rỗng; mỗi `aria-label` bắt đầu bằng text hiển thị | T-03-4H |
| B12 | Form: label + describedby | Mỗi `input`/`textarea` có `label[for]` khớp `id`; mọi id trong `aria-describedby` đều tồn tại | T-03-5H |
| B13 | Form: đủ 5 state | Submit rỗng → `invalid` + focus vào Name; nhập đúng → `success` + mail client mở; thêm `?form=fail` → `error` (`role="alert"`); dán 500 ký tự tiếng Việt → `error` (vượt `MAX_MAILTO_LENGTH`) | T-03-5J |
| B14 | Không double submit, không mất dữ liệu | Trong `submitting` nút bị `disabled`; sau success/error nội dung form vẫn còn | T-03-5J |
| B15 | Form chạy khi tắt JS | DevTools → Disable JavaScript → submit rỗng hiện bubble native; submit hợp lệ mở mailto | T-03-5H |
| B16 | 375px, 0 cuộn ngang | Device toolbar 375×667 → `document.documentElement.scrollWidth <= innerWidth` → `true` | Tất cả *C |
| B17 | Bàn phím 100% | Tab: skip-link → toggle (`Space`/`Enter`) → nav → filter (`Enter`) → link card → các field → submit; focus ring luôn thấy được | Tất cả |
| B18 | Contrast ≥ 4.5:1 cả 2 theme | Lighthouse Accessibility ở light và dark; kiểm tra thêm text lỗi/success bằng color picker | T-03-0C, *C |
| B19 | 0 lỗi console | Toggle 20 lần, lọc qua lại, submit đủ 5 state → console trống | Tất cả *J |
| B20 | Performance budget | Fast 3G + Disable cache → LCP < 2000 ms, CLS = 0 | T-03-6 |
| B21 | Grep sạch theo DoD | `grep -rnE "var \|innerHTML\|onclick=\|keyCode\|keypress\|style=\"\|https://cdn" Exercise_3/` → rỗng | T-03-6 |

---

## 6. Live Defense runbook (dự đoán thay đổi giảng viên yêu cầu)

| Yêu cầu | Chỗ sửa | Số dòng |
|---|---|---|
| Đổi `data-category` → `data-tag` | `index.html` (4 card) + 1 chỗ `.dataset.category` trong `project-filter.js` | ~5 |
| Thêm category "Mobile" | Thêm 1 `<li><button data-filter="mobile">` + `data-category="mobile"` trên card. **JS không đổi** | 2 |
| Thêm field "Phone" có `pattern` | `index.html` (field + error span); map lỗi thêm `patternMismatch` | ~6 |
| Đổi `minlength` của message | Sửa attribute trong HTML + text hint. JS đọc từ `ValidityState` nên không đổi | 2 |
| Đổi icon theme switcher | Thay `<path>` trong SVG. CSS và JS không đổi | 1–2 |
| Đổi grid card sang container query | `project-card.css`: `container-type: inline-size` trên `#projects`, `@container` thay cho `auto-fit` | ~6 |
| Đổi màu lỗi | 1 dòng primitive hoặc mapping `--color-danger` trong `tokens.css` | 1 |

> Mọi thay đổi đều sửa đúng 1 file component, vì state, token và selector đã được chốt trong contract này.

---

## 7. Kế hoạch commit

Tuân thủ đầy đủ `project-rules.md` §6 (khác Ex2, bài này không có lý do để trộn loại file):

| # | Commit message | File |
|---|---|---|
| 1 | `docs(spec): exercise 3 component contracts & WBS` | file này |
| 2 | `chore(html): exercise 3 baseline from exercise 2` | `index.html` |
| 3 | `chore(css): exercise 3 baseline tokens & layout` | `css/tokens.css`, `css/layout.css` |
| 4 | `chore(js): exercise 3 baseline theme engine` | `js/theme.js` |
| 5 | `chore(assets): hero avatar avif/webp/jpg` | `assets/*` |
| 6–7 | `feat(html): hero section` → `feat(css): hero section` | T-03-1H, T-03-1C |
| 8–9 | `feat(html): theme switcher icons` → `feat(css): theme switcher icon state` | T-03-2H, T-03-2C |
| 10–11 | `feat(html): skills matrix badges` → `feat(css): skills matrix grid` | T-03-3H, T-03-3C |
| 12–14 | `feat(html): project cards & filter` → `feat(css): project cards` → `feat(js): project filter state` | T-03-4H/C/J |
| 15–17 | `feat(html): contact form` → `feat(css): contact form states` → `feat(js): contact form controller` | T-03-5H/C/J |
| 18+ | `fix(<type>): …` | Bản sửa sau audit T-03-6, mỗi commit 1 loại file |

> Commit 3 thêm token và đổi tên `.badge-list` cùng lúc. Lý do: đây là copy baseline cộng thay đổi dùng chung, và chỉ chạm CSS.

---

## 8. Rủi ro & quyết định đã chốt

| Rủi ro | Quyết định | Lý do |
|---|---|---|
| 7 file CSS chặn render, HTTP/1.1 (Live Server) giới hạn 6 kết nối/host, có thể đẩy LCP > 2s trên Fast 3G | Giữ 1 file/component; đo ở T-03-6 | Tách file là mục tiêu kiến trúc của bài. **Fallback:** nếu B20 fail thì gộp 5 file component thành `css/components.css` (1 commit `refactor(css)`, giữ nguyên tên section) |
| Icon flash (FOUC) với người chọn dark mà chưa lưu: HTML ban đầu là `aria-pressed="false"` cho tới khi `theme.js` (defer) chạy | Chấp nhận, giống quyết định FOUC của Ex2 | Đổi icon không phải layout shift (cùng kích thước) → CLS vẫn = 0 |
| Ảnh là ảnh do AI tạo, có watermark, tên file sai loài | Alt ghi "cheetah cub"; crop tròn che watermark; nói rõ nguồn khi vấn đáp | Bài học F-02 |
| mailto không cho biết email có được gửi thật hay không | Thông báo success chỉ nói "email app should open"; dữ liệu được giữ lại | Trung thực với người dùng; không giả lập "Sent" |
| URL mailto dài với tiếng Việt có dấu | `maxlength="500"` + kiểm tra `MAX_MAILTO_LENGTH = 2000` → error | Mail client cắt URL dài một cách im lặng |
| Filter bar vô dụng khi tắt JS | Chấp nhận | Nếu ẩn rồi hiện bằng JS thì gây CLS lúc load; cards vẫn hiển thị đủ khi không có JS |
| Lọc làm grid co lại (layout shift) | Chấp nhận | Shift trong 500ms sau click/keydown được loại khỏi CLS (`hadRecentInput`) |

---

## 9. Prompt log & bằng chứng

| Task | Link prompt | Screenshot | AI sai gì / mình sửa gì |
|---|---|---|---|
| T-03-0A | — (script) | — | |
| T-03-1 | _(dán link share)_ | `screenshots/ex3-hero-375.png`, `screenshots/ex3-hero-network-avif.png` | |
| T-03-2 | _(dán link share)_ | `screenshots/ex3-switcher-a11y-tree.png` | |
| T-03-3 | _(dán link share)_ | `screenshots/ex3-skills-grid.png` | |
| T-03-4 | _(dán link share)_ | `screenshots/ex3-filter-ai.png` | |
| T-03-5 | _(dán link share)_ | `screenshots/ex3-form-invalid.png`, `-success.png`, `-error.png` | |
| T-03-6 | _(dán link share)_ | `screenshots/ex3-lighthouse.png`, `screenshots/ex3-perf-fast3g.png` | |
