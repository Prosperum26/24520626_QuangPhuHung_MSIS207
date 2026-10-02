# AI_FAILURE_AUDIT – MSIS207 Lab 1

> Các lỗi **thật** do AI (Claude Code – Claude Opus 5.5) sinh ra trong quá trình làm lab, được phát hiện khi review.
> Mỗi lỗi gồm: (1) Defect Description, (2) Diagnostic Method, (3) Refactored Solution.
> Prompt tương ứng xem trong [`PROMPT_LOG.md`](PROMPT_LOG.md).

---

## F-01 – Nội dung minh họa của slide bị nhồi vào portfolio (content drift)

**Prompt gây lỗi:** P-03 (T-01a → T-01d) · **Commit chứa lỗi:** `e7c62e1` · **Commit sửa:** `082430b`

### 1. Defect Description
Khi được yêu cầu "viết HTML theo outline", AI lấy các **ví dụ dạy cú pháp** trong slide và đưa thẳng vào nội dung hiển thị của trang, khiến trang trông như bài tóm tắt đề thay vì portfolio cá nhân:
- "Fun fact: … H<sub>2</sub>O boils at 100°C … 2<sup>10</sup> = 1024 bytes" – chép ví dụ `sub`/`sup` của slide 8.
- Câu trích dẫn "HTML is the foundation…" – lấy từ slide 1.
- "My workflow used to be ~~copying whole assignments into an AI chat~~" – lời bình về workflow AI của lab.
- Mô tả project bằng yêu cầu chấm điểm: "zero-`<div>`", "never renders user input as HTML", "drift-free countdown".

### 2. Diagnostic Method
- Đọc lại trang trên Live Server dưới góc nhìn người tuyển dụng → nội dung không nói gì về bản thân hay giá trị của project.
- Đối chiếu từng câu với slide 1 và 8 → trùng khớp với ví dụ trong slide.
- `git diff e7c62e1 082430b -- Exercise_1/index.html` để xác nhận phạm vi thay đổi.

### 3. Refactored Solution
- Viết lại `#about` thành 2 đoạn giới thiệu bản thân; chỉ dùng `<strong>`/`<em>` ở chỗ thật sự cần.
- Viết lại mô tả 3 project theo góc nhìn người dùng (làm được gì), không theo tiêu chí chấm.
- Thêm **rule 8** vào `project-rules.md` §2: *"Slides teach syntax, not content"* để ngăn lỗi lặp lại ở các bài sau.

**Bài học:** Thẻ ngữ nghĩa phải phục vụ nội dung thật; không ép nội dung để "trình diễn" thẻ.

---

## F-02 – Ảnh trỏ tới file không tồn tại, alt text bịa nội dung

**Prompt gây lỗi:** P-03 · **Commit chứa lỗi:** `e7c62e1` · **Commit sửa:** `da32e48`

### 1. Defect Description
AI sinh 1 avatar và 3 `<picture>` (avif/webp/jpg) trỏ tới `assets/…`, trong khi thư mục `assets/` **không tồn tại**. Alt text mô tả chi tiết những ảnh chưa có, ví dụ *"Portrait of Phu Hung smiling in front of a laptop"* – một mô tả hoàn toàn bịa đặt.

### 2. Diagnostic Method
- `ls Exercise_1/assets` → `No such file or directory`.
- Hậu quả dự kiến: 4–10 request 404 trong DevTools › Network, console có lỗi, Lighthouse bị trừ điểm, screen reader đọc mô tả sai sự thật.

### 3. Refactored Solution
- Tạm bỏ toàn bộ `<picture>`/`<img>`; hoãn sub-task T-01d (media) sang Exercise 2/3.
- Khi thêm ảnh thật: alt phải mô tả đúng nội dung ảnh thật, kèm `width`/`height`; không `loading="lazy"` cho ảnh LCP.

---

## F-03 – Trích dẫn ghi sai nguồn và bị cắt xén

**Prompt gây lỗi:** P-03 · **Commit chứa lỗi:** `e7c62e1` · **Commit sửa:** `da32e48` (sau đó bỏ hẳn ở `082430b`)

### 1. Defect Description
```html
<blockquote cite="https://developer.mozilla.org/">
  <p>HTML is the foundation. CSS enhances presentation. JavaScript enhances behavior.</p>
</blockquote>
```
- `cite` trỏ tới **MDN**, nhưng câu này là của giảng viên trong slide 1 → ghi sai nguồn.
- Bị cắt mất vế cuối *"AI enhances the developer."*

### 2. Diagnostic Method
Đối chiếu nguyên văn với slide 1 của file đề; tìm câu trên MDN không có kết quả.

### 3. Refactored Solution
Ban đầu sửa thành `figure > blockquote + figcaption` ghi đúng tác giả và đủ câu. Sau F-01, bỏ hẳn trích dẫn vì không thuộc nội dung portfolio.

---

## F-04 – Sai kiến thức: "2^10 = 1024 bytes in a kilobyte"

**Prompt gây lỗi:** P-03 · **Commit chứa lỗi:** `e7c62e1` · **Commit sửa:** `da32e48`

### 1. Defect Description
AI khẳng định 1 kilobyte = 1024 byte. Theo chuẩn SI/IEC, **1 kB = 1000 byte**, còn 1024 byte = **1 KiB (kibibyte)**.

### 2. Diagnostic Method
Review nội dung khi audit (P-04), đối chiếu chuẩn IEC 80000-13.

### 3. Refactored Solution
Sửa thành "kibibyte (KiB)"; sau F-01 thì bỏ hẳn câu này.

---

## F-05 – Dùng sai `<cite>` khi sửa lỗi F-03

**Prompt gây lỗi:** P-05 · **Phát hiện và sửa:** tự sửa tay trước commit `da32e48`

### 1. Defect Description
Khi sửa F-03, AI viết:
```html
&mdash; <cite lang="vi">MSc. Trần Vĩnh Khiêm</cite>, Lab 1: …
```
Theo HTML Living Standard, `<cite>` dùng cho **tiêu đề của tác phẩm**, không dùng cho **tên người**.

### 2. Diagnostic Method
Tra MDN `<cite>`: *"used to mark up the title of a creative work"*; đọc lại diff trước khi commit.

### 3. Refactored Solution
```html
&mdash; <span lang="vi">MSc. Trần Vĩnh Khiêm</span>, <cite>Lab 1: Modern Web Development &amp; AI-Assisted Engineering</cite>
```
Tên người đặt trong `<span lang="vi">` (để screen reader phát âm tiếng Việt), `<cite>` chỉ bọc tên tác phẩm.

---

## F-06 – Link giữ chỗ và đề xuất vượt contract (lỗi nhẹ)

**Prompt gây lỗi:** P-02, P-03 · **Commit sửa:** `da32e48`

### 1. Defect Description
- 3 link "Source code" cùng trỏ `https://github.com/` (trang chủ) dù `aria-label` khác nhau; link GitHub trong `address` hiển thị `github.com/your-username`.
- Ở P-02, AI tự thêm section `#skills` và `form` không có trong contract §3.1 của `TASK_DECOMPOSITION.md`.

### 2. Diagnostic Method
`grep -n 'github.com/"' Exercise_1/index.html`; đối chiếu cây đề xuất với contract §3.1.

### 3. Refactored Solution
- Link trỏ tới repo thật: `https://github.com/Prosperum26/MSIS207_Lab1/tree/main/<thư-mục>`; `aria-label` bắt đầu bằng text hiển thị (WCAG 2.5.3).
- Từ chối phần vượt contract; chỉ giữ `#about`, `#projects`, `#contact`.
