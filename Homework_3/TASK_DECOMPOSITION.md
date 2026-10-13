# TASK_DECOMPOSITION – Homework 3: Resilient Event Hub & AI Failure Audit

> Work Breakdown Structure (WBS) cho HW3.
> File này được commit **trước** mọi code (`docs(spec)`), đúng quy tắc §6 của `project-rules.md`.
> Mỗi prompt AI tham chiếu **đúng 1** task ID (ví dụ `T-03-J`) và đính kèm `project-rules.md` + phần contract liên quan.
> **Luật của đề:** cấm one-shot prompt (đưa cả đề cho AI sinh lỗi timezone và memory leak). Làm theo 3 slice, tối thiểu 5 commit nguyên tử.
> **Báo cáo bắt buộc (15%):** `AI_FAILURE_AUDIT.md` với ≥ 3 lỗi do AI gây ra, bắt được lúc review. Cách làm audit ở mục 5.

---

## 1. Mục tiêu và phạm vi

Một landing page một trang cho một sự kiện, chịu lỗi tốt ("resilient"), gồm 3 slice:

| Slice | Nội dung | Điểm khó của đề |
|---|---|---|
| S1 | **Drift-free countdown**: đếm ngược tới mốc UTC ISO 8601 (`...Z`) | `setInterval` trôi, lệch múi giờ, rò rỉ timer |
| S2 | **Form state machine**: `idle → submitting → success / error` | Trạng thái nằm trên DOM, không có cờ boolean rải rác |
| S3 | **Chống double-submit và làm sạch input** (0 XSS) | Bấm đúp, Enter lặp, `innerHTML`, payload `<img onerror>` |

**Ngoài phạm vi:** backend thật, lưu dữ liệu, gửi email, đa ngôn ngữ, thanh toán, CAPTCHA, đa sự kiện, nút đổi theme.

**Nội dung trang** (nội dung mẫu, xem câu hỏi mở 1): một sự kiện demo của lớp. Chỉ có mô tả ngắn, mốc thời gian, form đăng ký. Không bịa diễn giả, địa điểm hay số liệu.

---

## 2. Quy trình 4 bước áp dụng

| Bước | Áp dụng trong bài |
|---|---|
| 1. Functional Slicing | Theo slice (S1 → S2 → S3). Trong mỗi slice tách phần **lõi thuần** (không chạm DOM) khỏi phần **gắn DOM** |
| 2. Contract Definition | Chốt mục 3 trước khi viết code: id, `data-state`, API module, config |
| 3. Atomic Generation | 1 prompt = 1 task ID = 1 file. Không bao giờ prompt cả 3 slice cùng lúc |
| 4. Contract Verification | Mỗi task có cổng kiểm tra riêng (mục 7). Lõi thuần test được trong console không cần trang |

---

## 3. Contract (chốt trước khi viết code)

### 3.1 Cấu trúc file

```
Homework_3/
├── TASK_DECOMPOSITION.md
├── AI_FAILURE_AUDIT.md          ← T-A2 (và nhật ký ứng viên từ đầu)
├── index.html                   ← T-01-H
├── css/
│   ├── tokens.css               ← T-01-C
│   └── hub.css                  ← T-01-C (+ trạng thái form ở T-04-C)
└── js/
    ├── config.js                ← T-01-J  CONFIG duy nhất
    ├── countdown.js             ← T-02-J  lõi thuần, không chạm DOM
    ├── sanitize.js              ← T-07-J  lõi thuần
    ├── form-machine.js          ← T-04-J  state machine, không chạm DOM
    ├── registration-api.js      ← T-04-J  adapter giả lập gửi form
    └── main.js                  ← T-03-J, T-05-J, T-08-J  nối dây, chạm DOM
```

Thứ tự `<script defer>`: `config` → `countdown` → `sanitize` → `form-machine` → `registration-api` → `main`. Không `<script>` inline, không inline handler.

### 3.2 `CONFIG` (một chỗ, sửa một dòng là đổi được)

```js
const CONFIG = {
  eventStartUtc: '2026-12-20T09:00:00Z',   // UTC ISO 8601, luôn có hậu tố Z
  eventName: 'Web Foundations Demo Day',
  announceEverySeconds: 60,                // tần suất đọc cho screen reader
  submitTimeoutMs: 8000,
  mockDelayMs: 1200,
  mockOutcome: 'success',                  // 'success' | 'error'
  limits: { nameMax: 80, emailMax: 254, noteMax: 300 },
};
```

Mọi module đọc `CONFIG` qua tham số do `main.js` truyền vào. Module lõi không tự đọc biến toàn cục.

### 3.3 HTML contract

| Selector | Vai trò |
|---|---|
| `#countdown[data-state="running\|done\|invalid"]` | Vùng đếm ngược; JS chỉ ghi attribute, CSS đọc attribute |
| `#cd-days`, `#cd-hours`, `#cd-minutes`, `#cd-seconds` | Bốn ô số, ghi bằng `textContent` |
| `.countdown-time` | `<time datetime="…Z">` giờ bắt đầu, hiển thị theo giờ địa phương và có kèm UTC |
| `.countdown-status[role="status"]` | Thông báo cho screen reader, cập nhật thưa (xem D5), không cập nhật mỗi giây |
| `#register[data-state="idle\|submitting\|success\|error"]` | Vùng form; nguồn sự thật duy nhất của state |
| `#reg-form` | `<form novalidate>`; validate bằng JS, vẫn dùng `required`, `type`, `maxlength` |
| `#reg-name`, `#reg-email`, `#reg-note` | Ba field, mỗi field có `<label for>` và `aria-describedby` tới thông báo lỗi riêng |
| `#reg-submit` | `<button type="submit">`, nhãn đổi theo state |
| `.reg-success`, `.reg-error` | Panel kết quả; panel lỗi có `role="alert"` và nút `.reg-retry` |

Panel là `<p>`/`<section>` có heading đúng cấp, 0 `<div>` làm khung (như HW2).

### 3.4 State machine form

```
              SUBMIT (hợp lệ)             RESOLVE
   idle ─────────────────────▶ submitting ──────────▶ success   (cuối)
    ▲                              │
    │ EDIT (sửa field)             │ REJECT / TIMEOUT
    │                              ▼
    └─────────── RETRY ◀──────── error
```

| Từ | Sự kiện | Đến | Ghi chú |
|---|---|---|---|
| `idle` | `SUBMIT` và dữ liệu hợp lệ | `submitting` | Tại đây khoá nút, tạo `requestId` |
| `idle` | `SUBMIT` và dữ liệu sai | `idle` | Hiện lỗi từng field, focus field sai đầu tiên |
| `submitting` | `RESOLVE` | `success` | Trạng thái cuối, không có đường quay lại |
| `submitting` | `REJECT` hoặc `TIMEOUT` | `error` | Không mất dữ liệu người dùng đã nhập |
| `submitting` | `SUBMIT` | `submitting` | **Bỏ qua** (đây là chỗ chống double-submit, S3) |
| `error` | `RETRY` | `submitting` | Gửi lại cùng dữ liệu |
| `error` | `EDIT` | `idle` | Cho sửa rồi gửi tiếp |

- Đúng 4 state: `idle | submitting | success | error`. Không thêm state.
- `form-machine.js` không biết DOM: nhận sự kiện, trả state mới. `main.js` ghi `data-state` bằng **một** hàm `setState`.
- Chặn response muộn: mỗi lần gửi tăng `requestId`; kết quả của request cũ bị bỏ.

### 3.5 API từng module (không import chéo)

| Module | API | Ghi chú |
|---|---|---|
| `countdown.js` | `remaining(targetMs, nowMs)` → `{ done, days, hours, minutes, seconds, totalMs }`; `start({ targetIso, onTick, onDone, onInvalid })` → `{ stop() }` | Mỗi tick tính lại từ `Date.now()` so với mốc tuyệt đối, **không bao giờ giảm biến đếm**. `start` gọi lần hai thì dừng bản cũ trước. `stop()` idempotent, xoá sạch timer và listener |
| `sanitize.js` | `cleanName(s)`, `cleanEmail(s)`, `cleanNote(s)`, `validate(raw, limits)` | Thuần. `validate` trả `{ ok, values, errors }` |
| `form-machine.js` | `create(initial)` → `{ state, dispatch(event) }` | Thuần, test được trong console |
| `registration-api.js` | `submit(payload, { signal, mockOutcome, mockDelayMs })` → `Promise` | Giả lập. Tôn trọng `AbortSignal` |
| `main.js` | không có | Chỗ duy nhất biết tất cả; ghi DOM bằng `textContent` |

---

## 4. Các điểm cần con người quyết định

Đây là những chỗ đề không nói rõ và có nhiều hướng đi hợp lệ. AI **không** tự chọn lặng lẽ. Khi tới task liên quan, AI trình bày các lựa chọn kèm hệ quả và bạn chọn. Kết quả ghi vào `AI_FAILURE_AUDIT.md` (mục 5).

| ID | Quyết định | Lựa chọn dự kiến | Gợi ý mặc định | Task |
|---|---|---|---|---|
| D1 | Cách lên lịch tick | (a) `setInterval(1000)` + tính lại mỗi tick; (b) `setTimeout` tự canh về đầu giây kế (`1000 - now % 1000`); (c) `requestAnimationFrame` | (b) | T-02-J |
| D2 | Nguồn đồng hồ | (a) `Date.now()` (đổi giờ máy là lệch); (b) `performance.now()` neo một lần (đơn điệu nhưng lệch nếu máy sai giờ từ đầu) | (a) + ghi hạn chế | T-02-J |
| D3 | Tab bị ẩn (browser giảm nhịp timer) | (a) chỉ tính lại khi tab hiện lại; (b) dừng timer khi ẩn rồi `start` lại | (a) | T-03-J |
| D4 | Khi tới mốc | (a) hiện "Started"; (b) đổi sang trạng thái khác của trang (ẩn form) | (a) | T-03-J |
| D5 | Screen reader và đồng hồ | (a) `aria-live` cập nhật mỗi 60s; (b) không live, chỉ có nhãn tĩnh; (c) live mỗi giây (gây ồn) | (a) | T-03-J |
| D6 | Backend của form | (a) adapter giả lập có `mockOutcome`; (b) `fetch` tới dịch vụ bên ngoài (vi phạm "không CDN/ngoài"); (c) server Node cục bộ | (a) | T-04-J |
| D7 | Cách chứng minh trạng thái `error` khi vấn đáp | (a) đổi `mockOutcome` một dòng; (b) tham số `?demo=error` trên URL; (c) cả hai | (a) | T-04-J |
| D8 | Khi `error`, giữ hay xoá dữ liệu đã nhập | (a) giữ nguyên; (b) xoá | (a) | T-04-J |
| D9 | Nút khi `submitting` | (a) `disabled` (mất focus với bàn phím); (b) `aria-disabled="true"` và chặn bằng JS (giữ focus) | (b), vì `disabled` làm bàn phím mất vị trí | T-05-J |
| D10 | Làm sạch input | (a) từ chối ký tự lạ và báo lỗi; (b) chuẩn hoá âm thầm (trim, bỏ ký tự điều khiển); (c) cả hai theo field | (c): tên chuẩn hoá, email từ chối | T-07-J |
| D11 | Lớp phòng thủ XSS | Chỉ `textContent`; thêm CSP `<meta>` (`script-src 'self'`); thêm kiểm tra Trusted Types | `textContent` + CSP meta | T-08-J |
| D12 | Idempotency của lần gửi | (a) chỉ chống ở client; (b) kèm `requestId` (`crypto.randomUUID()`) trong payload để server khử trùng | (b) | T-06-J |

Nếu gặp thêm điểm quyết định mới khi code, thêm dòng vào bảng này **trước** khi chọn.

---

## 5. Kế hoạch audit (2 lần) và cách viết `AI_FAILURE_AUDIT.md`

### 5.1 Định nghĩa "lỗi do AI" trong bài này

Chỉ ghi những gì **thật sự có trong code AI sinh ra** và được bắt bằng review, không dựng lỗi để có cái mà sửa. Có 3 loại phát hiện hợp lệ:

1. **Lỗi thật:** hành vi sai, lệch giờ, rò rỉ, XSS, mất focus...
2. **Điểm cần con người quyết định:** AI chọn một hướng mà đề không quy định (mục 4), có thể sai ngữ cảnh.
3. **Điểm cải thiện:** chạy đúng nhưng có phương án tốt hơn, và bạn cân nhắc giữa các phương án.

### 5.2 Mẫu mỗi mục trong báo cáo

| Trường | Nội dung |
|---|---|
| Mô tả lỗi (đề yêu cầu) | AI viết gì, sai ở đâu, hệ quả |
| Cách phát hiện (đề yêu cầu) | Git diff, breakpoint, DevTools, script tái hiện. Ghi lệnh/ảnh chụp |
| Phương án | Các hướng sửa khả dĩ A/B/C kèm đánh đổi |
| Quyết định | Bạn chọn gì và vì sao |
| Giải pháp đã refactor (đề yêu cầu) | Commit sửa, đoạn code trước/sau, bằng chứng đã kiểm chứng |

Cần **≥ 3 mục**. Nên giữ khoảng 5 ứng viên và chọn 3 mục tốt nhất khi viết bản cuối.

### 5.3 Hai thời điểm audit

| Audit | Thời điểm | Phạm vi | Vì sao đặt ở đây |
|---|---|---|---|
| **Audit A (giữa dev)** | Sau **T-05** (xong S1 + S2) và **trước** S3 | Countdown (drift, múi giờ, tab ẩn, leak) và form state machine | S3 gia cố thứ S2 vừa làm. Phát hiện ở S2 quyết định cách S3 thiết kế. Timer là chỗ AI hay sai nhất, nên bắt sớm khi code còn nhỏ |
| **Audit B (hoàn thiện)** | Sau **T-08** (xong S3) và polish | Toàn trang: double-submit, XSS, CSP, a11y, hiệu năng, hồi quy các sửa của Audit A | Audit A chưa thấy được lỗi chỉ xuất hiện khi 3 slice chạy cùng nhau |

Ngoài hai buổi chính, mỗi lần AI trả code cho một task, ghi nhanh 1–2 dòng vào mục **"Nhật ký ứng viên"** ở cuối `AI_FAILURE_AUDIT.md` (có thấy gì lạ không, có chỗ nào đề không nói rõ). Rất rẻ, và đây là nguồn chính cho báo cáo.

### 5.4 Quy trình mỗi buổi audit

1. **Chế độ review** (`project-rules.md` §2.6): AI chỉ liệt kê phát hiện, không sửa. Dùng checklist ở mục 7.
2. Với mỗi phát hiện: AI nêu phương án và đánh đổi, **bạn chọn**.
3. Sửa trong commit riêng, thông điệp trỏ tới mã phát hiện (ví dụ `fix(countdown): ... (audit A-2)`).
4. Chạy lại cổng kiểm tra tương ứng, ghi bằng chứng.
5. Ghi mục vào `AI_FAILURE_AUDIT.md`.

---

## 6. Kế hoạch commit

Tối thiểu 5 commit nguyên tử theo slice (đề). Kế hoạch dưới là 11 commit, mỗi commit một việc, **AI không tự commit, chỉ đề xuất**.

| # | Commit | Task | Slice |
|---|---|---|---|
| 0 | `docs(spec): task decomposition for homework 3` | — | — |
| 1 | `feat(hub): add page skeleton and HTML contract` | T-01 | nền |
| 2 | `feat(countdown): drift-free countdown engine` | T-02-J | S1 |
| 3 | `feat(countdown): bind engine to page with lifecycle cleanup` | T-03-J | S1 |
| 4 | `feat(form): registration form markup and state styles` | T-04-H/C | S2 |
| 5 | `feat(form): state machine and mock registration api` | T-04-J, T-05-J | S2 |
| 6 | **Audit A** → `docs(audit): review of slices 1-2 (audit A)` + các `fix(...)` theo quyết định | T-A1 | — |
| 7 | `feat(form): prevent double submit` | T-06-J | S3 |
| 8 | `feat(form): input sanitization and zero-XSS rendering` | T-07-J, T-08-J | S3 |
| 9 | **Audit B** → `docs(audit): full review (audit B)` + các `fix(...)` | T-A2 | — |
| 10 | `docs(audit): add AI_FAILURE_AUDIT report` | T-A3 | — |

Nếu một slice thấy cần tách nhỏ hơn, tách thêm commit, không gộp.

---

## 7. Task list chi tiết

### Nền

| ID | Việc | Cổng kiểm tra |
|---|---|---|
| T-01-H | `index.html` theo 3.3: skip-link, landmark, 1 `h1`, vùng countdown với 4 ô số, `<time>`, vùng form (chưa có JS) | 0 `div`, 0 inline style/handler, `href="#…"` đều có đích |
| T-01-C | `tokens.css`, `hub.css`: màu trong `:root`, dark mode theo OS, 375px không scroll ngang, `focus-visible`, `prefers-reduced-motion`, `[data-state]` cho countdown và form | 0 hex ngoài `:root`, contrast ≥ 4.5:1 sáng/tối |
| T-01-J | `config.js` theo 3.2 | Một chỗ duy nhất định nghĩa mốc sự kiện |

### S1 – Countdown

| ID | Việc | Cổng kiểm tra |
|---|---|---|
| T-02-J | `countdown.js` theo 3.5 (chốt D1, D2 trước khi viết) | `remaining()` đúng với các mốc: quá khứ, đúng 0, 1ms trước mốc, > 99 ngày; `start` hai lần chỉ có 1 timer; `stop()` dọn sạch; mốc không hợp lệ gọi `onInvalid` thay vì `NaN` |
| T-03-J | `main.js` phần countdown: ghi 4 ô bằng `textContent`, `data-state`, `<time datetime>` + giờ địa phương (chốt D3, D4, D5) | Đổi múi giờ trong DevTools (Sensors → Location → Timezone) giờ hiển thị đổi nhưng số đếm không đổi; đóng/mở tab hết lệch; không tăng listener/timer sau khi `start`/`stop` 50 lần |

### S2 – Form state machine

| ID | Việc | Cổng kiểm tra |
|---|---|---|
| T-04-H/C | Markup form theo 3.3 (label, mô tả lỗi, panel success/error) và CSS theo `[data-state]` | Mỗi input có label; ẩn/hiện đúng theo state; 375px ổn |
| T-04-J | `form-machine.js` + `registration-api.js` (chốt D6, D7, D8) | Chuyển state đúng bảng 3.4 bằng test console; `AbortSignal` huỷ được; đủ 4 state ép được trên trang |
| T-05-J | `main.js` phần form: validate, `setState` duy nhất, focus quản lý (lỗi đầu tiên, panel kết quả), `requestId` chống response muộn | Quy trình `idle → submitting → success` và `→ error → retry` chạy; 0 lỗi console |

### Audit A

| ID | Việc |
|---|---|
| T-A1 | Review chế độ chỉ liệt kê cho S1+S2 theo mục 5.4. Công cụ: Git diff, breakpoint, DevTools Performance monitor (JS event listeners, DOM nodes), thử đổi giờ máy và múi giờ, giả lập tab nền. Sửa theo quyết định, mỗi sửa một commit |

### S3 – Chống double-submit và làm sạch input

| ID | Việc | Cổng kiểm tra |
|---|---|---|
| T-06-J | Chống double-submit (chốt D9, D12): máy trạng thái bỏ qua `SUBMIT` khi `submitting`; nút khoá theo D9; `requestId` đi kèm payload | Bấm đúp nhanh, nhấn Enter lặp, bắn hai sự kiện `submit` liên tiếp: `registration-api` chỉ được gọi **1** lần |
| T-07-J | `sanitize.js` (chốt D10): chuẩn hoá Unicode NFC, bỏ ký tự điều khiển, trim, gộp khoảng trắng, giới hạn độ dài, kiểm tra email | Bảng test: payload `<img src=x onerror=alert(1)>`, `"><script>`, `javascript:`, chuỗi RTL/zero-width, chuỗi quá dài |
| T-08-J | Hiển thị an toàn (chốt D11): mọi nội dung người dùng chỉ vào DOM qua `textContent`; thêm CSP `<meta>` | `grep` không còn `innerHTML`; nhập payload XSS rồi gửi, trang hiển thị nguyên văn, không thực thi |

### Audit B và báo cáo

| ID | Việc |
|---|---|
| T-A2 | Review toàn trang, chạy toàn bộ cổng mục 8, Lighthouse + axe-core (cài ngoài repo), kiểm tra hồi quy các sửa của Audit A |
| T-A3 | Viết `AI_FAILURE_AUDIT.md` bản cuối: chọn ≥ 3 mục tốt nhất theo mẫu 5.2, kèm commit và bằng chứng |

---

## 8. Cổng kiểm tra (Git Bash, từ thư mục gốc repo)

```bash
# 1. Cấm pattern nguy hiểm / cũ
grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|\bvar |onclick=|keyCode|keypress" Homework_3 --include=*.js --include=*.html

# 2. Không inline style, không CDN
grep -rnE "style=\"|https?://(cdn|unpkg)" Homework_3 --include=*.html

# 3. Timer: mọi setInterval phải có clearInterval tương ứng; không đếm bằng cách giảm biến
grep -nE "setInterval|setTimeout|clearInterval|clearTimeout" Homework_3/js/*.js
grep -nE "(remaining|seconds|count)\s*(--|-=)" Homework_3/js/*.js   # phải rỗng

# 4. Mốc thời gian luôn là UTC (…Z), không parse chuỗi không có múi giờ
grep -rnE "new Date\(['\"][^'\"]*['\"]\)" Homework_3/js
grep -n "eventStartUtc" Homework_3/js/config.js

# 5. Module lõi không chạm DOM
grep -nE "document\.|window\.|querySelector" Homework_3/js/countdown.js Homework_3/js/sanitize.js Homework_3/js/form-machine.js

# 6. Hex/rgb chỉ nằm trong :root
grep -nE "#[0-9a-fA-F]{3,8}\b|rgb\(" Homework_3/css/hub.css
```

Kiểm tay: 375px không scroll ngang, chỉ dùng bàn phím, Lighthouse Accessibility không cảnh báo mới, Performance monitor không tăng listener/node khi lặp thao tác.

---

## 9. Definition of Done (mỗi task)

Áp dụng `project-rules.md` §8, cộng thêm:

- [ ] Task chỉ chạm file trong danh sách của nó; đúng tên trong contract mục 3.
- [ ] Mọi điểm quyết định liên quan (mục 4) đã được hỏi và ghi lại, không chọn ngầm.
- [ ] Sau mỗi output của AI, đã ghi 1–2 dòng vào "Nhật ký ứng viên".
- [ ] Prompt được ghi vào `docs/`; **AI không tự commit**, chỉ đề xuất.
- [ ] Bạn giải thích được từng dòng của diff (live defense).

---

## 10. Rủi ro và cách xử lý

| Rủi ro | Dấu hiệu | Xử lý |
|---|---|---|
| Đồng hồ trôi hoặc nhảy số | Giây bị lặp/bỏ, lệch so với `Date.now()` | Tính lại từ mốc tuyệt đối mỗi tick (D1, D2) |
| Parse ngày sai múi giờ | `new Date('2026-12-20T09:00:00')` không có `Z` | Cấm chuỗi không có `Z` (cổng 4); `onInvalid` khi mốc không hợp lệ |
| Rò rỉ timer/listener | Performance monitor tăng sau nhiều lần `start`/`stop` | `stop()` idempotent, `start` dừng bản cũ, test lặp 50 lần |
| Response muộn ghi đè state | Gửi → Retry nhanh, thấy kết quả của lần cũ | `requestId` (3.4) |
| `disabled` làm mất focus bàn phím | Sau khi gửi, Tab nhảy về đầu trang | D9 chọn `aria-disabled`; quản lý focus ở T-05-J |
| Screen reader đọc đồng hồ mỗi giây | Quá ồn | D5: cập nhật thưa |
| Báo cáo bị coi là "tự tạo lỗi" | Mục audit không có commit AI gốc làm bằng chứng | Mỗi mục trỏ về commit/diff thật (mục 5.1) |

## 11. Câu hỏi mở (mặc định đã chọn, không chặn việc)

1. **Sự kiện:** mặc định "Web Foundations Demo Day", mốc `2026-12-20T09:00:00Z`, chỉ là nội dung mẫu cho bài lab. Thay trong `CONFIG` nếu có sự kiện thật. Nếu để mốc đã qua, trang hiện trạng thái "started".
2. **Ngôn ngữ trang:** tiếng Anh (`lang="en"`), như các bài trước.
3. **Số field form:** 3 field (`name`, `email`, `note`). `note` là ô tự do, dùng để thử nghiệm làm sạch input và XSS.
4. **Công cụ audit:** Lighthouse và axe-core cài trong thư mục tạm, không đưa vào repo (như HW1).
