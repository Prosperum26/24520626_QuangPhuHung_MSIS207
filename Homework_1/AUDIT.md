# AUDIT – Homework 1 (bản build v1, trước các milestone M1–M4)

> Audit ở chế độ **review**: chỉ liệt kê phát hiện, **không sửa code**. Mỗi phát hiện gắn với milestone sẽ xử lý nó.
> Chạy trên bản gồm 6 feature (layout, hero, projects, skills/contact, theme, nav) và hiệu ứng chuyển động (T-12), qua `http://127.0.0.1:5599` (máy chủ tĩnh, không nén, không cache header).
> Trình duyệt: Edge (Chromium) headless. Công cụ: Lighthouse 13.5.0, axe-core 4.14.0 (tag `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`), và các script đo riêng qua giao thức DevTools. Các công cụ cài trong thư mục tạm, **không** nằm trong repo.

## Tóm tắt

| Milestone | Số phát hiện cần sửa | Mức |
|---|---|---|
| M1 – a11y (WCAG 2.2 AA) | 0 lỗi AA. 4 điểm nên củng cố | thấp |
| M2 – focus / bàn phím | 0 lỗi, 0 bẫy focus. 2 điểm nên củng cố | thấp |
| M3 – CSP | 1 việc bắt buộc (chưa có CSP). Trang đã tương thích | cao |
| M4 – hiệu năng | **1 lỗi thật (CLS 0.224 trên mobile)** và 4 điểm tối ưu | cao |

Điểm Lighthouse hiện tại:

| | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Mobile | **87** | 100 | 100 | 100 | 2.1 s | **0.224** | 0 ms |
| Desktop | 100 | 100 | 100 | 100 | 0.5 s | 0.001 | 0 ms |

---

## M1 – WCAG 2.2 AA

### Đã kiểm tra và đạt

| Tiêu chí | Cách kiểm tra | Kết quả |
|---|---|---|
| Quy tắc tự động | axe-core ở 4 cấu hình (1280px sáng, 1280px tối, 375px sáng có menu mở, 375px tối) | 0 vi phạm, 45–46 quy tắc đạt |
| 1.4.3 / 1.4.11 Tương phản chữ | Script tự đo: mọi text node ngoài hero, màu chữ so với nền cộng dồn qua các lớp tổ tiên | 136–142 text node, **0 dưới AA**, thấp nhất 3.03:1 (số `01`, chữ lớn) |
| 1.4.3 Chữ trên ảnh hero | Ẩn chữ, chụp ảnh nền, lấy điểm sáng nhất dưới từng dòng chữ so với `--sand` (axe không tính được nên báo "cần xem lại") | 6 cấu hình, điểm tệ nhất **4.98:1** (1920px, chữ nhỏ), phần lớn 5.4–9.0 |
| Landmark | DOM | 1 `banner`, 1 `main`, 1 `contentinfo`, 1 `nav[aria-label="Primary"]`, 5 `section[aria-labelledby]` |
| Heading | DOM | Một `h1`; thứ tự `1 2 3 3 3 2 3 3 3 3 3 2 3 3 3 3 3 2`, không nhảy cấp |
| 2.4.7 / 2.4.13 Focus nhìn thấy | Tab thật, đọc `outline` của từng điểm dừng, 4 cấu hình | 19–20 điểm dừng, **mọi điểm** có outline ≥ 3px, tỉ lệ vòng/nền thấp nhất 4.63:1 (sáng), 5.91:1 (tối) |
| 2.4.11 Focus không bị che | Tab thật, so vị trí phần tử với đáy header dính | 0 trường hợp bị che |
| 2.5.8 Kích thước mục tiêu | Đo mọi `a[href]`, `button` | 0 mục < 24px; nhỏ nhất 38×71px ("Back to top") |
| 1.4.10 Reflow | Viewport 320px và 640px | Không scroll ngang (`scrollWidth` 305 / 625) |
| 1.4.12 Giãn chữ | Ép line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em | Không scroll ngang, không cắt nội dung (chỉ các phần tử `visually-hidden`, chủ ý) |
| 1.4.4 / 1.4.13 / 2.3.3 | `prefers-reduced-motion: reduce` | Hiệu ứng tắt hoàn toàn (0 phần tử `data-reveal`) |
| Forced colors (Windows) | Giả lập `forced-colors: active` | Đọc được; trình duyệt tự đặt nền đen sau chữ hero |

### Phát hiện (đều không phải lỗi AA)

| ID | Mô tả | Mức | Đề xuất cho M1 |
|---|---|---|---|
| A-1 | Số `01`–`05` của card (`.project-index`, màu `--decor`) đạt **3.03:1**, sát ngưỡng 3:1 của chữ lớn. Là trang trí (`aria-hidden`) nhưng không có biên an toàn | Thấp | Đổi sang màu có tỉ lệ ≥ 4.5:1 (ví dụ `--text-muted`) hoặc giữ `--decor` và ghi nhận là trang trí |
| A-2 | `axe` báo `color-contrast` "cần xem lại" 49–54 phần tử vì nền có ảnh và lớp hạt cát. Đã bù bằng phép đo pixel và script tự đo ở trên, nhưng **không có kiểm tra tự động nào chạy lại được trong CI** | Thấp | Đưa script đo (hoặc một checklist cố định) vào README để chạy lại sau mỗi lần đổi màu/ảnh |
| A-3 | Thiếu `<meta name="color-scheme" content="light dark">`. Trình duyệt có thể nháy nền trắng trước khi CSS tải, ở người dùng dark mode | Thấp | Thêm meta vào `<head>` |
| A-4 | `scroll-padding-top` = `--header-h` + 1rem = 72px, nhưng header thật cao 68px (mobile) / 60px (desktop) cộng mép sóng 12px. Khi nhảy tới anchor, mép sóng trang trí có thể đè 8px lên đầu section | Rất thấp | Tính `scroll-padding-top` từ chiều cao thật của header |

---

## M2 – Focus và bẫy bàn phím

### Đã kiểm tra và đạt

| Kiểm tra | Kết quả |
|---|---|
| Tab xuyên cả trang, desktop 1280px | 19 điểm dừng, thoát ra thanh trình duyệt, **không có bẫy** |
| Tab xuyên cả trang, mobile 375px, menu mở | 20 điểm dừng: Menu → 4 link → Dark mode → hero → 5 card → email → Copy → GitHub → LinkedIn → Back to top. Thứ tự Tab trùng thứ tự nhìn thấy |
| Menu mobile | Mở bằng click; **Esc** đóng và trả focus về nút Menu; click ra ngoài đóng; chọn link đóng; Tab ra khỏi header đóng |
| Nút Retry (trạng thái lỗi) | Click → `loading`, focus chuyển về `#projects-title`, không mất focus |
| Skip link | Tab lần 1 → skip link hiện; Enter → `#main-content`; Tab kế tiếp rơi **vào trong `main`** ("See my projects"), không quay lại nav |
| Không dùng focus trap | Menu là disclosure; không có `keydown` nào nuốt phím Tab |
| Phím lặp | `Escape` có `if (event.repeat) return;`; không dùng `keyCode`/`keypress` |

### Phát hiện

| ID | Mô tả | Mức | Đề xuất cho M2 |
|---|---|---|---|
| K-1 | `<main id="main-content">` không có `tabindex="-1"`. Chromium vẫn chuyển điểm bắt đầu Tab đúng, nhưng skip link phụ thuộc hành vi này; `document.activeElement` sau Enter là `body` | Thấp | Thêm `tabindex="-1"` vào `main` (và `outline: none` chỉ cho `main:focus`, không cho phần tử khác) để focus thật sự vào `main` |
| K-2 | Chọn một link trong menu mobile đóng menu, nhưng phần tử vừa focus (link) bị ẩn nên `activeElement` rơi về `body`. Không phải bẫy (Tab tiếp tục từ mục tiêu anchor), nhưng người dùng trình đọc màn hình mất ngữ cảnh | Thấp | Sau khi đóng vì chọn link, chuyển focus tới tiêu đề của section đích |

---

## M3 – CSP chặt và không inline handler

### Hiện trạng

| Kiểm tra | Kết quả |
|---|---|
| Inline handler (`on*=`) | **0** (`grep` trên `*.html`, `*.js`) |
| `style=""` trong markup | **0** |
| `<script>` có nội dung trong HTML | **0** (mọi script là `<script src>`) |
| `innerHTML`, `var`, `keyCode`, `keypress` | **0** |
| Màu hex/rgb ngoài `tokens.css` | **0** |
| URL ngoài trong CSS/JS | **0** |
| **CSP** | **Chưa có** ← việc bắt buộc của M3 |

### Thử nghiệm trước: chính sách của mục 4.3 trong TD

Áp chính sách lên một bản sao rồi tải trang và dùng thử mọi tính năng:

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self';
connect-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'
```

| Cấu hình | Feed (5 card) | Ảnh hero | Font Nunito | Đổi theme | Nút từ tính | Lỗi console | Request bị chặn |
|---|---|---|---|---|---|---|---|
| Không CSP | ✓ | ✓ | ✓ | ✓ | ✓ | không | không |
| CSP của TD §4.3 | ✓ | ✓ | ✓ | ✓ | ✓ | **không** | **không** |
| CSP + `require-trusted-types-for 'script'` | ✓ | ✓ | ✓ | ✓ | ✓ | **không** | **không** |

Điểm đáng chú ý: `element.style.setProperty()` (nút từ tính, CSSOM) **không bị `style-src 'self'` chặn**. CSP chỉ chặn thuộc tính `style` trong markup và thẻ `<style>`. Trang cũng chạy được dưới Trusted Types vì không dùng `innerHTML` hay `eval`.

| ID | Mô tả | Mức | Đề xuất cho M3 |
|---|---|---|---|
| S-1 | Chưa có CSP | Cao | Thêm `<meta http-equiv="Content-Security-Policy">` làm phần tử **đầu tiên** sau `charset` trong `<head>` (meta chỉ áp cho nội dung đứng sau nó) |
| S-2 | Meta CSP **không hỗ trợ** `frame-ancestors`, `report-uri`/`report-to`, `sandbox`. Máy chủ tĩnh không gửi được header | Thông tin | Ghi rõ giới hạn trong README (cho phần vấn đáp). Khi triển khai thật, chuyển CSP sang header HTTP |
| S-3 | `require-trusted-types-for 'script'` chạy sạch | Tùy chọn | Cân nhắc thêm: miễn phí, và là bằng chứng rõ cho "không bao giờ gán HTML từ chuỗi" |
| S-4 | Cần chứng minh CSP hiệu lực chứ không chỉ "có mặt" | Cao | Kiểm thử ngược: thêm tạm một `onclick=` hoặc `<script>` inline vào bản sao, xác nhận trình duyệt báo `Refused to ...` rồi gỡ ra |

---

## M4 – Hiệu năng

### Phát hiện

| ID | Mô tả | Mức | Bằng chứng |
|---|---|---|---|
| P-1 | **CLS 0.224 trên mobile** (ngưỡng tốt 0.1), chiếm gần hết phần điểm mất của Performance 87 | **Cao** | `main` bị đẩy 201px: header cao **269px → 68px** khi JS chạy và đóng menu mobile. Menu đang mở trong HTML rồi mới đóng |
| P-2 | Desktop: nav rộng **258px → 381px** khi nút "Dark mode" hiện ra sau JS. CLS 0.001, chưa vượt ngưỡng nhưng là cùng một lỗi thiết kế | Thấp | Đo bằng cách tắt JS rồi so |
| P-3 | 12 tài nguyên chặn render (11 file CSS + `theme-init.js`), ước tính tiết kiệm 460 ms trên mobile mô phỏng | Trung bình | Lighthouse `render-blocking-insight` |
| P-4 | Ảnh hero có kích thước dư: Lighthouse ước tính tiết kiệm 13 KiB ở desktop (dùng bản 1600w cho khung 1335px) | Thấp | `image-delivery-insight` |
| P-5 | CSS chưa minify, ước tính 11 KiB | Thấp | `unminified-css` (không ảnh hưởng điểm Performance, ảnh hưởng dung lượng) |
| P-6 | Không có cache header và không nén văn bản (156 KiB, 9 KiB) | **Không sửa được trong repo** | Máy chủ phát triển tĩnh; thuộc cấu hình triển khai. Ghi vào README |

### Dung lượng

26 request, **174 KB** truyền tải. Lớn nhất: ảnh hero AVIF 52 KB, font latin 38 KB, tài liệu HTML 14 KB, font Việt 13 KB. Toàn bộ CSS ≈ 42 KB, toàn bộ JS ≈ 18 KB.

### Thử nghiệm trước: vá P-1 và P-2 trên bản sao

Chỉ đổi HTML sao cho trạng thái thu gọn được vẽ ngay từ đầu (menu `hidden` sẵn, nút Menu và nút theme không `hidden`). Không đụng gì khác.

| | Performance | CLS |
|---|---|---|
| Mobile, hiện tại | 87 | 0.224 |
| Mobile, sau vá (2 lần chạy) | **99, 99** | **0, 0** |
| Desktop, hiện tại | 100 | 0.001 |
| Desktop, sau vá | 100 | 0 |

Phần còn thiếu 1 điểm ở mobile nằm ở LCP 2.1 s (FCP 1.5 s), do 12 tài nguyên chặn render (P-3) và ảnh hero (P-4). Cần xử lý hai điểm đó để chạm 100.

Lưu ý khi sửa thật: nếu chỉ đổi HTML như bản thử, **không JS thì menu mobile bị ẩn hẳn** (mất khả năng dùng nav) và nút đổi theme vô dụng. Cách sửa thật phải giữ progressive enhancement, ví dụ theo hướng `theme-init.js` thêm class `js` lên `<html>` sớm, và CSS chỉ thu gọn menu khi có class đó.

---

## Việc cần chốt trước khi sang các commit milestone

1. **M1 không có lỗi AA nào để sửa.** Commit `fix(a11y): contrast & landmarks` chỉ gồm A-1 đến A-4. Cần quyết định có làm hay không (xem phần giải thích milestone).
2. **M2 tương tự**: K-1 và K-2 là củng cố, không phải lỗi.
3. **M3 và M4 có việc thật**: thêm CSP (S-1, S-4) và sửa CLS (P-1, P-2) cùng các điểm tối ưu P-3, P-4.
