# TASK_DECOMPOSITION – Exercise 1: Semantic DOM Architecture & A11y Contract

> Work Breakdown Structure (WBS) cho Exercise 1.
> Tài liệu này được viết và commit **trước** khi prompt AI sinh code.
> Mục đích: thể hiện cách chia bài thành các sub-task nhỏ, định nghĩa contract trước, rồi mới prompt AI cho **từng** sub-task một (không one-shot).

---

## 1. Mục tiêu bài

Xây dựng `index.html` cho trang portfolio cá nhân chỉ bằng **semantic HTML5**, đáp ứng:

- **0 thẻ `<div>`**: chỉ dùng landmark và các thẻ có ngữ nghĩa.
- Có **skip-link** để người dùng bàn phím nhảy thẳng tới nội dung chính.
- Đúng **1 thẻ `<h1>`**, heading không nhảy cấp.
- Chỉ HTML: **không CSS, không JS** trong bài này (commit gộp HTML + CSS = 0 điểm).

**Ngoài phạm vi (để dành cho Exercise 2+):** styling, layout, dark mode, JavaScript.

---

## 2. Quy trình 4 bước áp dụng

| Bước | Áp dụng trong bài |
|---|---|
| 1. Functional Slicing | Chia trang thành 5 sub-task độc lập T-01a → T-01e (mục 4) |
| 2. Contract Definition | Chốt trước cây landmark, id, anchor, quy tắc heading (mục 3) |
| 3. Atomic Generation | Mỗi prompt AI chỉ giải quyết **1** sub-task, đính kèm `project-rules.md` + contract |
| 4. Contract Verification | Mỗi sub-task có cổng kiểm tra riêng, pass mới chuyển task tiếp (mục 5) |

---

## 3. Contract (chốt trước khi viết code)

### 3.1 Cây landmark

```
<body>
├── a.skip-link[href="#main-content"]        ← phần tử focus được đầu tiên
├── header
│   └── h1                                   ← h1 duy nhất của trang
├── nav[aria-label="Primary"]
│   └── ul > li > a[href="#about" | "#projects" | "#contact"]
├── main#main-content
│   ├── section#about[aria-labelledby="about-title"]       > h2#about-title
│   ├── section#projects[aria-labelledby="projects-title"] > h2#projects-title
│   │   └── article (mỗi project)                          > h3
│   └── section#contact[aria-labelledby="contact-title"]   > h2#contact-title
│       └── address
└── footer
    └── p (&copy; năm, tên)
```

### 3.2 Quy ước id / anchor

| id | Phần tử | Được tham chiếu bởi |
|---|---|---|
| `main-content` | `<main>` | skip-link |
| `about` | `<section>` | nav link |
| `projects` | `<section>` | nav link |
| `contact` | `<section>` | nav link |
| `*-title` | `<h2>` của từng section | `aria-labelledby` của section |

**Quy tắc:** mọi `href="#x"` phải trỏ tới một `id="x"` có thật.

### 3.3 Quy tắc nội dung

- Heading: `h1 → h2 → h3`, không nhảy cấp; cỡ chữ sẽ chỉnh bằng CSS ở bài sau, không chọn thẻ heading theo độ to.
- Nhấn mạnh: `<strong>` (quan trọng), `<em>` (nhấn giọng). Không dùng `<b>`/`<i>` để nhấn mạnh.
- Không dùng thẻ/thuộc tính đã lỗi thời: `<strike>` (dùng `<del>`/`<s>`), `<center>`, `<font>`, `border=`, `align=`.
- Ảnh: bắt buộc có `alt`, `width`, `height` (chống CLS); ảnh không nằm ở màn hình đầu dùng thêm `loading="lazy"`.
- Boilerplate: `<html lang="en">`, `<meta charset="UTF-8">`, viewport meta; **không** dùng `X-UA-Compatible`.
- Không có `style=""` inline, không có `onclick=""`, không có `<script>`.

---

## 4. Sub-tasks

| ID | Sub-task | Input | Output | Phụ thuộc |
|---|---|---|---|---|
| T-01a | Boilerplate HTML5 | Rule ở mục 3.3 | Khung `<!DOCTYPE>`, `<head>` chuẩn | — |
| T-01b | Cây landmark + skip-link | Contract 3.1, 3.2 | `header`, `nav`, `main`, `section` rỗng, `footer` | T-01a |
| T-01c | Nội dung văn bản & heading | Cây từ T-01b | Nội dung About/Contact, `h2`/`h3`, `address`, entity | T-01b |
| T-01d | Project cards & media | Cây từ T-01b | `article` cho mỗi project, `img`/`picture` đủ thuộc tính | T-01b |
| T-01e | Audit tổng | `index.html` hoàn chỉnh | Danh sách lỗi + bản sửa | T-01a → T-01d |

### Kế hoạch prompt cho từng sub-task

Mọi prompt đều mở đầu bằng: *"Đọc project-rules.md (đính kèm) trước khi đề xuất code. Chỉ làm đúng task dưới đây."*

- **T-01a:** "Tạo boilerplate HTML5 cho `index.html` theo rule mục 3.3. Chỉ phần `<head>` và `<body>` rỗng. Giải thích vai trò từng thẻ meta."
- **T-01b:** "Dựa trên cây landmark (dán contract 3.1 + 3.2), viết phần `<body>` gồm skip-link, header, nav, main, các section rỗng và footer. Không dùng `<div>`, không thêm CSS/JS, không thêm nội dung."
- **T-01c:** "Điền nội dung cho `#about` và `#contact`. Giữ đúng thứ tự heading, dùng `<address>` cho thông tin liên hệ, `&copy;` ở footer. Không đổi cấu trúc landmark đã có."
- **T-01d:** "Viết 2–3 `<article>` project trong `#projects`, mỗi card có `h3`, mô tả, link có `aria-label` rõ nghĩa. Ảnh phải có `alt`, `width`, `height`, `loading="lazy"`."
- **T-01e (review):** "Audit `index.html`: đếm `<div>`, kiểm tra heading hierarchy, anchor trỏ tới id có thật, alt/width/height của ảnh, thẻ lỗi thời. **Chỉ liệt kê lỗi, chưa sửa.**" → tự đánh giá từng lỗi rồi mới sửa.

---

## 5. Verification Gates (Acceptance Criteria)

| # | Tiêu chí | Cách kiểm tra | Task |
|---|---|---|---|
| V1 | 0 thẻ `<div>` | `grep -c "<div" Exercise_1/index.html` → `0` | T-01b, T-01e |
| V2 | Đúng 1 `<h1>` | `grep -c "<h1" Exercise_1/index.html` → `1` | T-01b |
| V3 | Landmark tree đúng contract | Chrome DevTools → Elements → **Accessibility** → bật *full accessibility tree*: thấy banner, navigation "Primary", main, contentinfo | T-01b |
| V4 | Skip-link hoạt động | Mở bằng Live Server, nhấn `Tab` lần đầu → skip-link hiện focus → `Enter` → nhảy tới `#main-content` | T-01b |
| V5 | Anchor hợp lệ | Click từng link trong nav → cuộn đúng section | T-01b |
| V6 | Heading không nhảy cấp | Extension HeadingsMap hoặc Lighthouse → *Heading elements are not in a sequentially-descending order* không xuất hiện | T-01c |
| V7 | Ảnh chống CLS & có alt | Lighthouse → Accessibility + Performance không cảnh báo về image `alt`/kích thước | T-01d |
| V8 | HTML hợp lệ | https://validator.w3.org/ → 0 error | T-01e |
| V9 | Không có CSS/JS | `grep -E "style=|<script|onclick" Exercise_1/index.html` → rỗng | T-01e |

---

## 6. Kế hoạch commit

| # | Commit message | Nội dung |
|---|---|---|
| 1 | `docs(spec): define ex1 landmark contract & WBS` | File này |
| 2 | `feat(html): semantic landmark tree` | `index.html` (T-01a → T-01e, chỉ HTML) |

> Commit HTML không được chứa bất kỳ file CSS/JS nào.

---

## 7. Prompt log & bằng chứng

| Task | Link prompt | Screenshot | AI sai gì / mình sửa gì |
|---|---|---|---|
| T-01a | _(dán link share)_ | — | |
| T-01b | _(dán link share)_ | `screenshots/ex1-a11y-tree.png` | |
| T-01c | _(dán link share)_ | `screenshots/ex1-headings.png` | |
| T-01d | _(dán link share)_ | — | |
| T-01e | _(dán link share)_ | `screenshots/ex1-validator.png`, `screenshots/ex1-skip-link.png` | |
