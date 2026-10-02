# PROMPT_LOG – MSIS207 Lab 1

> Nhật ký prompt AI theo từng sub-task. Mỗi dòng = 1 prompt atomic.
> Công cụ: **Claude Code (CLI)**, model Claude Opus 5.5. Claude Code không có link share công khai,
> nên transcript được export (`/export`) và lưu vào `docs/prompts/`.
> Lỗi chi tiết của AI được phân tích trong [`AI_FAILURE_AUDIT.md`](AI_FAILURE_AUDIT.md).

---

## Phiên 2026-10-02 – Setup & Exercise 1

| # | Task | Prompt (tóm tắt) | AI làm gì | Mình kiểm tra / sửa gì | Commit |
|---|---|---|---|---|---|
| P-01 | Setup | "Tạo 1 `project-rules.md` đề xuất cho lab này" | Đọc slide + `TASK_DECOMPOSITION.md`, tạo `project-rules.md` (mở rộng từ template slide 6) | Đọc lại từng rule; tự bổ sung mục **Slide Errata** (lỗi trong code mẫu của slide) | `e7c62e1` |
| P-02 | T-01b | "Dựa trên project-rules.md, đề xuất cây landmark… Chỉ outline dạng cây, CHƯA viết code. Ràng buộc: 0 div, 1 h1, có skip-link." | Đề xuất cây landmark; tự thêm `#skills` (table) và `form` ngoài contract; hỏi có giữ `role` viết tay không | **Từ chối** `#skills` và `form` (ngoài contract 3.1); **bỏ** `role` thừa; giữ `header`/`footer` trong `article` | — |
| P-03 | T-01a → T-01d | "Viết HTML theo đúng outline đã chốt. Chỉ HTML, không CSS, không JS." | Sinh `Exercise_1/index.html`, chạy grep kiểm tra V1, V2, V5, V9 | Phát hiện ảnh trỏ tới `assets/` không tồn tại (xem F-02) | `e7c62e1` |
| P-04 | T-01e | "Audit đoạn HTML: đếm số div, kiểm tra heading hierarchy, thuộc tính alt/width/height, label của input." | Chỉ liệt kê lỗi, không sửa: 0 div, heading OK, alt/width/height OK, không có input; thêm 8 lỗi rủi ro | Đối chiếu với slide 1: trích dẫn ghi sai nguồn (F-03); kilobyte ≠ 1024 byte (F-04) | — |
| P-05 | T-01e fix | "Tạm bỏ các picture/img, fix các lỗi rủi ro, link github https://github.com/Prosperum26." | Bỏ ảnh, sửa trích dẫn bằng `figure/figcaption/cite`, sửa KiB, link GitHub thật, `aria-label` chứa text hiển thị | **Tự sửa tay** lỗi `<cite>` bọc tên người (F-05) | `da32e48` |
| P-06 | T-01e fix | "Exercise 1 bị lệch xa so với portfolio, fix nó đi" | Thừa nhận đã nhồi ví dụ slide vào nội dung; viết lại About + mô tả project; thêm rule 8 vào `project-rules.md` | Duyệt lại nội dung trên Live Server (F-01) | `082430b` |
| P-07 | Docs | "Ok lưu log lại đi" | Tạo `PROMPT_LOG.md`, `AI_FAILURE_AUDIT.md` | — | _(chưa commit)_ |

---

## Verification Gates – Exercise 1 (trạng thái sau P-06)

| # | Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|---|
| V1 | 0 thẻ `<div>` | ✅ `grep -c "<div"` = 0 | |
| V2 | Đúng 1 `<h1>` | ✅ `grep -c "<h1"` = 1 | |
| V3 | Landmark tree đúng contract | ⏳ chưa chụp | `screenshots/ex1-a11y-tree.png` |
| V4 | Skip-link hoạt động | ⏳ chưa test trên Live Server | `screenshots/ex1-skip-link.png` |
| V5 | Anchor hợp lệ | ✅ 4/4 `href="#…"` có `id` tương ứng | |
| V6 | Heading không nhảy cấp | ✅ h1 → h2 → h3 ×3 → h2 | `screenshots/ex1-headings.png` |
| V7 | Ảnh chống CLS & có alt | ➖ hoãn – đã bỏ ảnh, T-01d chuyển sang Exercise 2/3 | |
| V8 | HTML hợp lệ (W3C validator) | ⏳ chưa chạy | `screenshots/ex1-validator.png` |
| V9 | Không có CSS/JS | ✅ không có `style=`, `<script`, `onclick` | |

---

## Ghi chú về Git history

- `e7c62e1` gộp **spec** (`project-rules.md`, `TASK_DECOMPOSITION.md`) và **code** (`index.html`) trong 1 commit (370 dòng, 3 file) → vi phạm rule "spec first" và rule "100+ dòng nhiều file". Cần tách trước khi push.
- `082430b` gộp `docs` (`project-rules.md`) và `feat(html)` trong 1 commit.
