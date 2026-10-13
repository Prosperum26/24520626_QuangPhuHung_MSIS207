# AI_FAILURE_AUDIT – Homework 3: Resilient Event Hub

> Báo cáo lỗi do AI gây ra, bắt được lúc review (đề yêu cầu ≥ 3 mục, mỗi mục có: mô tả lỗi, cách phát hiện, giải pháp đã refactor).
> Thêm hai trường để trung thực về quá trình: **Phương án** (các hướng sửa khả dĩ) và **Quyết định** (bạn chọn gì và vì sao).
> Quy tắc: chỉ ghi thứ **có thật trong code AI sinh ra**, kèm cách tái hiện. Không dựng lỗi để có cái mà sửa. Mỗi audit chạy ở chế độ review (`project-rules.md` §2.6): chỉ liệt kê, không sửa trong cùng lượt.

Trạng thái: **Audit A và B đã chạy; mọi mục đã có quyết định. Báo cáo cuối ở cuối file.** Audit B chạy sau S3. Bản báo cáo cuối (≥ 3 mục) viết ở T-A3.

---

## Audit A – giữa dev (S1 countdown + S2 form)

**Phạm vi:** commit `d54e102` (engine), `5ac2eb2` (gắn countdown), `713f2a5` (state machine + api), `29d738b` (form), `0952260` (minh hoạ), `b6fe159` (đồ họa).
**Phương pháp:**
- Đọc lại diff từng commit đối chiếu với contract trong `TASK_DECOMPOSITION.md`.
- 13 test Node cho `countdown.js` (đồng hồ và timer giả) và 13 test cho `form-machine.js`/`registration-api.js`.
- Kịch bản tái hiện trong Edge headless (iframe, ép state, đo `getBoundingClientRect`, đo CLS).
- axe-core 4.10.2 (cài ngoài repo) trên 4 state: idle, lỗi validate, error, success.
- Các gate grep ở mục 8 của spec.

### Tóm tắt

| ID | Loại | Mức | Mô tả ngắn | Kiểm chứng |
|---|---|---|---|---|
| A-1 | Lỗi thật | Cao | Form gửi dữ liệu cá nhân lên URL (GET) khi chưa có JS | CONFIRMED (tái hiện) |
| A-2 | Lỗi thật (UX) | Cao | Trên điện thoại, thông báo lỗi nằm ngoài màn hình khi gửi thất bại | CONFIRMED (đo toạ độ) |
| A-3 | Lỗi a11y | Trung bình | Bấm "Try again" làm nút tự ẩn, focus bàn phím có thể rơi về `body` | PLAUSIBLE (headless không xác nhận được) |
| A-4 | Kiến trúc | Trung bình | `main.js` không còn là composition root thuần (254 dòng, chứa logic) | CONFIRMED (đọc code, đếm dòng) |
| A-5 | Quyết định | Thấp | Lấy lại trang từ bfcache (nút Back) có thể để đồng hồ đứng tạm | PLAUSIBLE |
| A-6 | Cải thiện | Thấp | Câu thông báo cho screen reader làm tròn xuống ("31 minutes" khi còn 31m25s) | CONFIRMED (đọc code) |
| A-7 | Cải thiện | Thấp | Múi giờ có offset 0 (Europe/London) vẫn in "(… UTC)" thừa | CONFIRMED (chạy thử) |
| A-8 | Quyết định | Thấp | Công tắc `?demo=error` đi theo bản production | CONFIRMED (đọc code) |
| A-9 | Quyết định | Thấp | Đồng hồ tin giờ máy khách; máy sai giờ thì đếm sai | Đã biết từ D2 |
| A-10 | Hardening | Thấp | `setState` ghi bất kỳ chuỗi nào, không từ chối state lạ (bài Ex4 từ chối) | CONFIRMED (đọc code) |

### Chi tiết

#### A-1 – Dữ liệu cá nhân lọt lên URL khi chưa có JavaScript
- **Mô tả:** `<form id="reg-form">` không có `method` và `action`, nên mặc định là GET về chính trang. Logic chặn nằm trong `main.js`. Nếu JS tắt, bị chặn, hoặc người dùng bấm nhanh trước khi script `defer` chạy xong, trình duyệt gửi form thật.
- **Cách phát hiện:** gỡ thẻ `main.js` khỏi bản sao trang rồi gọi `form.requestSubmit()` với tên, email, ghi chú. Kết quả: URL thành `?name=Linh+Tran&email=linh%40example.com&note=private+note`. Email nằm trong lịch sử trình duyệt, log máy chủ và header `Referer`.
- **Phương án:**
  - (a) Thêm CSP `form-action 'none'` (đã định ở D11). Chặn mọi lần gửi native, kể cả lúc script chưa nạp. Nhược: người dùng không có JS bấm gửi thì không thấy gì.
  - (b) Đổi sang `method="post"` kèm `action`. Tránh lộ URL, nhưng dữ liệu vẫn bay đi tới một đích mà ta chưa có.
  - (c) Ẩn form khi không có JS (`noscript.css`) và hiện thông báo thay thế. Không bao phủ khoảng thời gian trước khi script chạy.
  - (d) Kết hợp (a) + (c). Phủ cả hai trường hợp, tốn thêm vài dòng.
- **Quyết định:** (d) CSP `form-action 'none'` (chặn gửi native cả lúc script chưa nạp) cộng ẩn form và hiện thông báo khi tắt JS. Lý do: hai biện pháp phủ hai trường hợp khác nhau, và CSP dù sao cũng phải có ở S3 (D11).
- **Giải pháp đã refactor:** Thêm `<meta http-equiv="Content-Security-Policy" content="form-action 'none'">` trong `<head>`, cộng `<noscript>` hiện thông báo và `noscript.css` ẩn form. Kiểm chứng: chạy lại đúng kịch bản cũ (bỏ `main.js`, gọi `requestSubmit()`), trước là `?name=Linh+Tran&email=linh%40example.com&note=…`, sau là không có điều hướng (`navigated=false`, URL không đổi). Mô phỏng tắt JS thấy form ẩn và thông báo "Registration needs JavaScript…". Commit: _chờ bạn commit_ (`fix(form): block native submit without js (audit A-1)`).

#### A-2 – Lỗi gửi form không nhìn thấy được trên điện thoại
- **Mô tả:** panel `.reg-error` nằm **trên** ba field, nút Register nằm dưới cùng. Khi gửi lỗi, người dùng vẫn đang nhìn nút (nhãn đổi "Sending…" rồi về "Register"), còn thông báo lỗi nằm xa phía trên. Screen reader nghe được nhờ `role="alert"`, người dùng mắt thường thì không thấy phản hồi gì.
- **Cách phát hiện:** viewport 375×667, cuộn nút Register vào cuối màn hình, ép `?demo=error`, gửi. Đo: panel lỗi `top=1661` còn nút `top=2257` (cách ~600px), panel không nằm trong viewport.
- **Phương án:**
  - (a) Đặt panel lỗi ngay trên hoặc dưới nút Register (cùng tầm mắt). Đơn giản, không động tới focus.
  - (b) Giữ nguyên vị trí, gọi `scrollIntoView` tới panel khi lỗi. Người dùng bị giật màn hình.
  - (c) Chuyển focus tới panel (`tabindex="-1"`). Tốt cho bàn phím và screen reader, nhưng đẩy focus khỏi nút vừa bấm.
  - (d) (a) + thông báo ngắn trong `aria-live` như hiện tại. Hợp nhất.
- **Quyết định:** (a) Đặt panel lỗi ngay dưới nút Register. Lý do: lỗi hiện đúng chỗ mắt đang nhìn, không động tới focus hay cuộn trang.
- **Giải pháp đã refactor:** Chuyển `.reg-error` xuống ngay sau `<form>` (dưới nút Register) và giới hạn bề rộng bằng form. Đo lại ở 375×667: khi nút ở giữa màn hình, panel lỗi `top=376, bottom=551` nằm trong viewport (trước đó cách nút ~600px, ngoài viewport). Axe: 0 vi phạm ở cả bốn state. Commit: _chờ bạn commit_ (`fix(form): show error next to submit button (audit A-2)`).

#### A-3 – Mất vị trí focus khi bấm "Try again"
- **Mô tả:** nút `.reg-retry` nằm trong `.reg-error`, panel này `display: none` ngay khi state chuyển sang `submitting`. Theo quy tắc "focus fixup" của HTML, phần tử đang focus mà bị ẩn thì focus rơi về `body`, người dùng bàn phím phải Tab lại từ đầu trang.
- **Cách phát hiện:** chưa xác nhận. Trong headless, `document.activeElement` vẫn trỏ vào nút đã ẩn vì iframe không có focus thật và không có vòng lặp render. Cần thử tay: Tab tới "Try again", nhấn Enter, xem phím Tab kế tiếp đi đâu.
- **Phương án:**
  - (a) Sau khi gửi lại, chủ động `focus()` nút Register (nhãn "Sending…") để giữ vị trí.
  - (b) Cho vùng trạng thái "Sending…" nhận focus (`tabindex="-1"`).
  - (c) Để nguyên, chấp nhận. Không khuyến nghị.
  - Liên quan D9 (nút khoá khi đang gửi) ở S3, nên gom xử lý chung.
- **Quyết định:** (a) Sau khi gửi lại, chủ động `focus()` nút Register (mặc định đã đề xuất, bạn chấp nhận). Gộp với D9: nút dùng `aria-disabled` nên giữ được focus.
- **Giải pháp đã refactor:** Trong handler của "Try again", gọi `submitBtn.focus()` sau `setState('submitting')`. Kiểm chứng: focus tại "Try again", bấm, `document.activeElement` là `reg-submit`, `aria-disabled="true"`. Phần "focus fixup" thật của trình duyệt vẫn nên thử tay. Commit: _chờ bạn commit_.

#### A-4 – `main.js` vượt vai trò composition root
- **Mô tả:** spec 3.5 và nguyên tắc HW2 nói `main.js` là chỗ duy nhất **nối** các module. Hiện nó dài 254 dòng và chứa logic: `formatStart`, `plural`, `announcement`, `validate`, và việc ghi trạng thái ra DOM của hai tính năng. Các hàm thuần này không test được nếu không dựng DOM, đúng loại thứ mà ta đã tách ra module riêng ở nơi khác. S3 sẽ thêm khoá nút, sanitize, CSP nên file còn phình tiếp.
- **Cách phát hiện:** `wc -l` (254 dòng) và đọc `main.js`; so sánh với `Homework_2/js/main.js` (~90 dòng, không chứa logic).
- **Phương án:**
  - (a) Để nguyên, chấp nhận. Ít việc nhất, nhưng khó giải thích khi vấn đáp "tại sao tách module nơi này mà không nơi kia".
  - (b) Rút các hàm thuần (`formatStart`, `plural`, `announcement`) sang `js/format.js` (thuần, test được). Giữ phần chạm DOM trong `main.js`. Việc vừa phải.
  - (c) Tách thêm `countdown-view.js` và `form-view.js`, để `main.js` chỉ còn nối dây (như HW2). Gọn nhất về kiến trúc, nhiều thay đổi nhất, cần chạy lại toàn bộ test.
- **Quyết định:** (b) Rút các hàm thuần (`formatStart`, `plural`, `pad`, `announcement`) sang `js/format.js`. Lý do: đủ để test được và giải thích được ranh giới module, ít rủi ro hơn tách hai view.
- **Giải pháp đã refactor:** Rút `plural`, `pad`, `startTime` (trước là `formatStart`) và `announcement` sang `js/format.js` (thuần, không `document`/`window`). `main.js` từ 254 xuống 221 dòng, chỉ còn ghi DOM và nối dây. Thêm 6 test Node cho `format.js` (5 múi giờ, số ít/số nhiều, dưới một phút); 13 + 13 test cũ và toàn bộ luồng trình duyệt vẫn đạt. Chưa chọn phương án (c) tách view, vì (b) đã đủ. Commit: _chờ bạn commit_ (`refactor(hub): extract pure formatting helpers (audit A-4)`).

#### A-5 – Lấy lại trang từ bfcache
- **Mô tả:** khi người dùng bấm Back/Forward và trình duyệt khôi phục trang từ bộ nhớ đệm (bfcache), timer bị đóng băng rồi chạy tiếp, nhưng `visibilitychange` có thể không bắn. Đồng hồ hiển thị giá trị cũ cho tới tick kế (tối đa ~1 giây). Chỉ là hiện tượng ngắn, vì mỗi tick tính lại từ mốc tuyệt đối.
- **Cách phát hiện:** suy luận từ đặc tả, chưa tái hiện (headless không có bfcache).
- **Phương án:** (a) thêm `pageshow` (với `event.persisted`) gọi `refresh()`; (b) chấp nhận.
- **Quyết định:** (a) Thêm `pageshow` với `event.persisted` gọi `refresh()` (mặc định đề xuất, bạn chấp nhận).
- **Giải pháp đã refactor:** Thêm `onPageShow` vào `initCountdown`, gỡ cùng `visibilitychange` khi xong. Kiểm chứng: đồng hồ nhảy +2 ngày rồi phát `pageshow(persisted)`, hiển thị `65:09:35:51` đúng bằng giá trị tính tay. Commit: _chờ bạn commit_.

#### A-6 – Câu thông báo cho screen reader làm tròn xuống
- **Mô tả:** `announcement()` đọc `values.minutes` nguyên, nên "31 minutes left" khi thực tế còn 31 phút 25 giây. Số đếm dùng `ceil` cho giây nhưng câu thông báo thì cắt bỏ phần giây, hai nơi làm tròn khác chiều nhau.
- **Phương án:** (a) thêm "about"; (b) làm tròn lên phút để khớp quy ước `ceil`; (c) giữ nguyên.
- **Quyết định:** (a) Thêm "About" (không có mặc định đề xuất, mình chọn rồi ghi rõ để bạn phản đối được; bạn chưa phản đối).
- **Giải pháp đã refactor:** `Format.announcement` bắt đầu bằng "About 27 days, 4 hours and 31 minutes left…". Cập nhật test. Commit: _chờ bạn commit_.

#### A-7 – Múi giờ offset 0 vẫn in "(… UTC)"
- **Mô tả:** `formatStart` bỏ phần UTC chỉ khi chuỗi chứa "UTC". Vùng như Europe/London mùa đông hiển thị "GMT" (offset 0) nên bị in thừa "(20 Dec, 02:00 UTC)".
- **Cách phát hiện:** chạy `formatStart` với 5 múi giờ, London cho `20 December 2026 at 02:00 GMT (20 Dec, 02:00 UTC)`.
- **Phương án:** so sánh offset thật (`getTimezoneOffset() === 0`) thay vì dò chuỗi.
- **Quyết định:** Đổi sang so sánh offset thật (mặc định đề xuất, bạn chấp nhận).
- **Giải pháp đã refactor:** `Format.isZeroOffset` đọc `timeZoneName: 'longOffset'` và coi `GMT`, `UTC`, `GMT+00:00` là offset 0. London mùa đông giờ chỉ in `20 December 2026 at 02:00 GMT`; mùa hè in `03:00 BST (20 Jul, 02:00 UTC)`. 6 test Node. Commit: _chờ bạn commit_.

#### A-8 – Công tắc demo đi theo bản production
- **Mô tả:** `?demo=error` ép giao diện lỗi cho bất kỳ ai. Đã whitelist đúng hai giá trị nên không có lỗ hổng injection, nhưng là một bề mặt hành vi mà người dùng thật không cần.
- **Phương án:** (a) giữ (tiện nhất khi vấn đáp trên bất kỳ máy nào); (b) chỉ bật khi `location.hostname` là `localhost`/`127.0.0.1`; (c) bỏ hẳn, chỉ dùng `CONFIG`.
- **Quyết định:** Giữ như hiện tại. Lý do: đã whitelist đúng hai giá trị, và tiện nhất khi vấn đáp trên máy khác. Ghi nhận bề mặt này ở đây để giải thích được khi bị hỏi.

#### A-9 – Đồng hồ tin giờ máy khách
- **Mô tả:** dùng `Date.now()` (D2). Máy khách chỉnh sai giờ thì đếm sai, ngay cả khi mốc UTC đúng. Đã ghi nhận ở D2, đưa vào đây để có phương án.
- **Phương án:** (a) chấp nhận và nêu hạn chế; (b) lấy giờ máy chủ qua `Date` header của một request cùng origin để tính độ lệch (cần mạng, `connect-src 'self'`).
- **Quyết định:** (a) Chấp nhận và nêu hạn chế (mặc định đề xuất, bạn chấp nhận).
- **Giải pháp đã refactor:** Không đổi code. Ghi hạn chế vào đầu `countdown.js` để người đọc thấy ngay.

#### A-10 – `setState` không từ chối state lạ
- **Mô tả:** `setState(next)` ghi thẳng `dataset.state`. Máy trạng thái chỉ trả giá trị hợp lệ, nhưng nếu sau này có chỗ gọi nhầm thì CSS im lặng không khớp gì. Bài Ex4 từng làm hàm này từ chối giá trị ngoài `STATES`.
- **Phương án:** thêm kiểm tra `FormMachine.STATES.includes(next)`.
- **Quyết định:** Thêm kiểm tra (mặc định đề xuất, bạn chấp nhận).
- **Giải pháp đã refactor:** `setState` của form ném `TypeError` nếu state không thuộc `FormMachine.STATES`. Commit: _chờ bạn commit_.

### Đã kiểm tra, không phát hiện lỗi

| Giả thuyết | Cách kiểm tra | Kết quả |
|---|---|---|
| Số ngày 3 chữ số tràn ô trong "vũng nước" ở 320px | Đặt mốc +183 ngày, đo `getBoundingClientRect` ở 320/375/1100px | Không tràn, không scroll ngang |
| Lệch bố cục khi "--" đổi thành số | `PerformanceObserver('layout-shift')` | CLS = 0 |
| Timer/listener rò rỉ | 50 chu kỳ `start`/`stop` trong test Node, đếm timer đang chờ | Không còn timer nào |
| Double submit trong hai state đầu | 3 sự kiện `submit` liên tiếp | API gọi đúng 1 lần (khoá nút xử lý ở S3) |
| XSS khi hiển thị tên người dùng | Tên `<img src=x onerror=…>`, kiểm tra DOM và `window` | Hiển thị thành chữ, 0 thẻ `img`, không thực thi |
| Phản hồi muộn ghi đè state | Timeout 500ms, API trả sau 3000ms | State vẫn là `error` |
| Vi phạm WCAG tự động | axe-core 4.10.2, 4 state | 0 vi phạm; 12 mục `color-contrast` ở mức "cần xem lại" (axe không tính được nền khi có khối blob và SVG đè; mình đã tính tay ≥ 5.3:1) |

---

## Nhật ký ứng viên

Ghi nhanh sau mỗi output của AI. Mục nào có **commit làm bằng chứng** thì mạnh hơn cho báo cáo cuối.

| Thời điểm | Quan sát | Có commit làm bằng chứng? |
|---|---|---|
| T-02-J | Bản đầu của `start()` có `now = Date.now`, tức giữ tham chiếu hàm lúc gọi, nên ghi đè `Date.now` trong DevTools không có tác dụng. AI tự bắt khi viết test và sửa thành `() => Date.now()` **trước khi commit** | Không (đã sửa trước commit) |
| Đồ họa | Bản redesign đầu: khối phụ ("vũng" nhạt) đè lên khối chính do `isolation: isolate` đặt sai chỗ; và khối xoay gây scroll ngang ở 320/375/768px | Không (sửa trước commit) |
| T-05 | Assertion "gửi lại cùng dữ liệu" trong bài test viết sai (so sánh tham chiếu `!==` trong khi thực tế gửi lại đúng đối tượng cũ). Lỗi nằm ở test, không ở code | Không |
| T-07 | `cleanNote` xoá tab thay vì đổi thành khoảng trắng, nên "y⇥⇥z" thành "yz" (hai từ dính nhau). Bắt bằng test bảng đầu vào của `sanitize.js`; sửa bằng cách đổi tab thành dấu cách trước khi bỏ ký tự điều khiển | Không (sửa trước commit) |
| A-7 | Mình giả định `longOffset` trả "GMT" cho offset 0, nhưng thực tế trả "GMT+00:00" (và lần đầu cho "UTC" cũng sai). Bắt bằng test nhiều múi giờ, rồi dò thực tế bằng `formatToParts` thay vì đoán | Không (sửa trước commit) |
| Test | Hai lỗi nằm ở **test**, không ở code: `undefined` kích hoạt tham số mặc định nên email hợp lệ được dùng thay; kỳ vọng "GMT+1" sai (en-GB gọi là "BST") | Không (không phải lỗi sản phẩm) |
| S3 | Khi thêm CSP đầy đủ, mình phải đổi `<link rel="icon" href="data:,">` sang file thật, vì `img-src 'self'` chặn `data:`; và các công cụ test dùng `eval` bị CSP chặn nên phải đổi cách spy API | Không (phát hiện lúc kiểm thử) |
| Giao diện | Sau khi đổi sang bốn ô kính trong "vũng nước", số ngày 3 chữ số ở 320px rộng 87px trong ô 86px (xem B-2). AI dùng cỡ chữ cố định theo `vw` mà không tính ô co lại | Không (đo và sửa trước commit) |

> Báo cáo cuối dùng A-1, A-2, A-4: có commit làm bằng chứng và có phương án thật sự đáng cân nhắc.

---

---

## Audit B – hoàn thiện

**Phạm vi:** toàn trang sau khi hoàn thiện giao diện (header dính, nút kêu gọi, ô kính, hover, minh hoạ, chân trang) và S3.
**Công cụ:** Lighthouse 12.8.2 (mobile và desktop), axe-core 4.10.2 (4 state), đo hình học bằng script (nhiều độ rộng), 4 bộ test Node (50 test), bộ kiểm tra S3 trong Edge qua máy chủ HTTP (cài ngoài repo), các gate grep.

### Kết quả tổng

| Hạng mục | Kết quả |
|---|---|
| Lighthouse mobile | Performance 99, Accessibility 100, Best Practices 100, SEO 100 (LCP 1.7s, CLS 0.001, TBT 20ms) |
| Lighthouse desktop | 100 / 100 / 100 / 100 |
| axe-core (idle, lỗi validate, error, success) | 0 vi phạm; 1 mục `color-contrast` "cần xem lại" mỗi state (axe không tính được nền khi có blob và SVG đè; tính tay ≥ 5.3:1) |
| Hồi quy S3 và các sửa của Audit A | Đạt: double-submit, khoá idempotency, sanitize, 4 payload XSS, CSP chặn script và handler inline và script ngoài, `form-action` chặn gửi native, `pageshow`, timeout |
| Console | Chỉ có đúng các vi phạm CSP do chính các đòn thử nghiệm gây ra, không có vi phạm nào từ trang |
| Thứ tự Tab | 11 điểm dừng hợp lý (skip-link, brand, About, Register, hai nút hero, ba field, nút gửi, Back to top), 0 `tabindex` dương, nút "Try again" ẩn thì không với tới được |
| Cấu trúc | 1 `h1`, heading đúng cấp, 4 landmark, 16 SVG đều `aria-hidden`, mọi anchor có đích |
| Mục tiêu chạm | Không phần tử tương tác nào nhỏ hơn 24px (WCAG 2.5.8) ở 340 đến 1280px |
| Giảm chuyển động | Animation của rùa tắt khi `prefers-reduced-motion: reduce` (`drift` thành `none`) |
| Scroll ngang | Không có ở 320, 340, 360, 375, 390, 768, 1100, 1280px |

### Phát hiện

| ID | Loại | Mức | Mô tả ngắn | Tình trạng |
|---|---|---|---|---|
| B-1 | Lỗi UX | Thấp | Header dính xuống hai hàng dưới 340px, chiếm ~14% màn hình 568px | Giảm nhẹ, chấp nhận phần còn lại |
| B-2 | Lỗi thật | Trung bình | Số ngày 3 chữ số tràn ô ở 320px sau khi đổi sang ô kính | Đã sửa |
| B-3 | Hiệu năng | Thấp | Lighthouse mobile 99: 5 stylesheet chặn render | Quyết định giữ nguyên |
| B-4 | Khoảng trống kiểm chứng | Thấp | Trạng thái hover và focus chưa xem được bằng ảnh trong headless | Cần xem tay |

#### B-1 – Header dính xuống hai hàng ở màn hình rất hẹp
- **Mô tả:** header `position: sticky` chứa tên và hai liên kết. Ở 320px chúng không đủ một hàng, header cao 80px, đúng bằng `scroll-padding-top` ban đầu nên mục tiêu của liên kết neo nằm sát mép dưới header.
- **Cách phát hiện:** script đo `getBoundingClientRect` của header và `scrollPaddingTop` ở 320, 340, 360, 375, 390, 768, 1100, 1280px.
- **Phương án:** (a) tăng `scroll-padding-top` và thu gọn nút để header một hàng càng sớm càng tốt; (b) bỏ `sticky` ở màn hình hẹp; (c) giữ nguyên.
- **Quyết định:** (a). Lý do: thanh điều hướng dính hữu ích khi cuộn trang dài, và (b) mất lợi ích đó ở đúng nơi cần nhất.
- **Giải pháp đã refactor:** `scroll-padding-top` từ 5rem lên 5.5rem (88px), `padding` của liên kết và cỡ chữ thương hiệu nhỏ lại. Đo lại: header một hàng (50px) từ 340px trở lên; chỉ còn hai hàng (79px) dưới 340px, nhưng `scroll-padding` 88px vẫn lớn hơn. Chấp nhận phần dưới 340px.

#### B-2 – Số ngày 3 chữ số tràn ô ở 320px
- **Mô tả:** sau khi đổi đồng hồ sang bốn ô kính, cỡ chữ vẫn là `clamp(3.25rem, 15vw, 5.5rem)` tính theo chiều rộng màn hình chứ không theo chiều rộng ô. Ô co lại, nên "183" ngày rộng 87px trong ô 86px, chạm viền. Sự kiện cách hơn 99 ngày hoàn toàn có thể xảy ra.
- **Cách phát hiện:** đặt mốc sự kiện +183 ngày, đo `#cd-days` và `.countdown-cell` ở 320px: `value 87px, tile 86px`.
- **Phương án:** (a) giảm cỡ chữ tối thiểu cho mọi trường hợp; (b) container query: cỡ chữ tính theo chiều rộng của chính ô (`cqi`); (c) JS thêm thuộc tính khi có 3 chữ số.
- **Quyết định:** (b). Lý do: không cần JS, không phải đoán số chữ số, tự thích ứng ở mọi độ rộng.
- **Giải pháp đã refactor:** `.countdown-cell { container-type: inline-size }` và `.cd-value { font-size: clamp(2.25rem, 50cqi, 4.75rem) }`, xoá token `--font-size-count` không còn dùng. Đo lại: `value 62px, tile 86px`, vừa với khoảng trống. Commit: _chờ bạn commit_.

#### B-3 – Năm stylesheet chặn render
- **Mô tả:** Lighthouse mobile chấm Performance 99 vì 5 stylesheet (fonts, tokens, hub, art, noscript) chặn render, ước tính tiết kiệm 380 đến 530ms ở mô phỏng mạng chậm. Các mục còn lại (nén, cache dài hạn, rút gọn) là do máy chủ Python thử nghiệm không nén và không đặt header cache, không phản ánh Live Server hay máy chủ thật.
- **Phương án:** (a) gộp thành một file CSS (khó chỉnh khi vấn đáp); (b) `<link rel="preload">` cho font; (c) giữ nguyên.
- **Quyết định:** (c), mặc định đề xuất vì 99 đã tốt và chia file giúp trả lời "sửa ở đâu". Có thể đổi sang (b) nếu muốn điểm 100.

#### B-4 – Hover và focus chưa nhìn thấy bằng ảnh
- **Mô tả:** Edge headless không ép được `:hover`, nên gạch chân nav lớn dần, nút nâng lên, hàng chủ đề đổi nền và biểu tượng xoay mới được kiểm bằng đọc CSS, không phải bằng ảnh chụp. Riêng `prefers-reduced-motion` đã đo thật.
- **Cách xem tay:** rê chuột qua About, hai nút hero, các hàng chủ đề, ô nhập; Tab qua từng điểm dừng để xem vòng focus.

---

## Báo cáo cuối: ba lỗi do AI gây ra, bắt được lúc review

Ba mục dưới đây đều có **commit sửa** làm bằng chứng và commit gây lỗi nằm trong git history. Mỗi mục theo mẫu đề yêu cầu (mô tả, cách phát hiện, giải pháp), thêm các phương án đã cân nhắc và quyết định.

### 1. Dữ liệu cá nhân lọt lên URL khi form gửi mà không có JavaScript (audit A-1)

**Mô tả lỗi.** `<form id="reg-form" novalidate>` không có `method` và `action`, nên mặc định là GET về chính trang. Mọi thứ chặn gửi native nằm trong `main.js` (`event.preventDefault()`). AI viết form theo hướng "JS xử lý hết" mà không nghĩ tới lúc JS tắt, bị chặn, hoặc chưa tải xong (script `defer`). Khi đó trình duyệt gửi thật và đưa tên, email, ghi chú lên URL, lịch sử trình duyệt, log máy chủ và header `Referer`.

**Cách phát hiện.** Gỡ thẻ `main.js` khỏi bản sao, gọi `form.requestSubmit()` với dữ liệu thật. Kết quả: URL trở thành `?name=Linh+Tran&email=linh%40example.com&note=private+note`. Commit gây lỗi: `29d738b feat(form): registration form with four states`.

**Phương án đã cân nhắc.** (a) chỉ CSP `form-action 'none'`; (b) `method="post"` (hết lộ URL nhưng dữ liệu vẫn bay đi); (c) chỉ ẩn form khi tắt JS (không phủ khoảng thời gian trước khi script chạy); (d) kết hợp CSP và ẩn form.

**Quyết định.** (d): hai biện pháp phủ hai trường hợp khác nhau.

**Giải pháp đã refactor** (commit `409ad23 fix(form): block native submit without js`):

```html
<!-- trước: không có gì chặn gửi native -->
<form class="reg-form" id="reg-form" novalidate>

<!-- sau -->
<meta http-equiv="Content-Security-Policy" content="form-action 'none'">
<noscript><p class="reg-nojs">Registration needs JavaScript. Please turn it on and reload this page.</p></noscript>
```

```css
/* noscript.css: tắt JS thì ẩn form */
.reg-form { display: none; }
```

**Kiểm chứng.** Chạy lại đúng kịch bản cũ: `navigated=false`, URL không đổi. Log của trình duyệt ghi `Sending form data to '…?name=Linh+Tran…' violates … form-action 'none'`. Sau khi có CSP đầy đủ ở S3, kịch bản này vẫn đạt.

### 2. Thông báo lỗi nằm ngoài màn hình trên điện thoại (audit A-2)

**Mô tả lỗi.** Panel `.reg-error` được đặt **trên** ba field, còn nút Register nằm dưới cùng. Khi gửi thất bại, người dùng vẫn nhìn nút (nhãn đổi "Sending…" rồi về "Register") còn thông báo nằm xa phía trên, nên không thấy phản hồi nào. Screen reader nghe được nhờ `role="alert"`, nhưng người dùng mắt thường thì không.

**Cách phát hiện.** Viewport 375×667, cuộn nút Register vào cuối màn hình, ép `?demo=error`, gửi, đo `getBoundingClientRect`: panel `top=1661`, nút `top=2257`, cách nhau ~600px, panel không nằm trong viewport. Commit gây lỗi: `29d738b`.

**Phương án đã cân nhắc.** (a) đặt panel ngay dưới nút Register; (b) giữ vị trí nhưng cuộn tới panel; (c) chuyển focus tới panel (đẩy focus khỏi nút vừa bấm); (d) giữ nguyên.

**Quyết định.** (a): lỗi hiện đúng chỗ mắt đang nhìn, không động tới focus hay cuộn trang.

**Giải pháp đã refactor** (commit `91d0082 fix(form): show error next to submit button`):

```html
<!-- trước: panel nằm trước <form> -->
<p class="reg-error">…</p>
<form class="reg-form">…</form>

<!-- sau: panel ngay sau <form>, dưới nút Register -->
<form class="reg-form">…</form>
<p class="reg-error">…</p>
```

**Kiểm chứng.** Đo lại cùng kịch bản: khi nút ở giữa màn hình, panel `top=376, bottom=551` nằm trong viewport. axe-core 0 vi phạm ở cả bốn state.

### 3. `main.js` vượt vai trò composition root (audit A-4)

**Mô tả lỗi.** Spec và nguyên tắc từ Homework 2 nói `main.js` chỉ **nối** các module. AI nhét vào nó 254 dòng gồm cả logic: `formatStart`, `plural`, `announcement`, `pad`, `validate`. Đây đúng là loại hàm thuần mà ở chỗ khác ta đã tách ra module riêng để test; ở đây chúng không test được nếu không dựng DOM.

**Cách phát hiện.** `wc -l Homework_3/js/main.js` (254) so với `Homework_2/js/main.js` (88); đọc `main.js` đối chiếu spec mục 3.5. Commit gây lỗi: `5ac2eb2 feat(countdown): bind engine to page with lifecycle cleanup` và `29d738b`.

**Phương án đã cân nhắc.** (a) để nguyên; (b) rút các hàm thuần sang `format.js`; (c) tách thêm `countdown-view.js` và `form-view.js` để `main.js` chỉ còn nối dây.

**Quyết định.** (b): đủ để test được và giải thích được ranh giới, ít rủi ro hơn (c).

**Giải pháp đã refactor** (commit `cbb4d7a refactor(hub): extract pure formatting helpers`):

```js
// trước (main.js): các hàm thuần nằm lẫn với việc ghi DOM
function plural(n, word) { … }
function formatStart(ms, timeZone) { … }
function announcement(values) { … }

// sau: js/format.js, không có document, window hay timer
const Format = (function () { … return { pad, plural, startTime, announcement }; })();
// main.js chỉ gọi: Format.pad(…), Format.startTime(…), Format.announcement(…)
```

**Kiểm chứng.** `main.js` từ 254 xuống 221 dòng; thêm 6 test Node cho `format.js` (5 múi giờ, số ít và số nhiều, dưới một phút); gate `grep "document\.|window\.|querySelector"` trên `format.js` rỗng; toàn bộ test và luồng trình duyệt cũ vẫn đạt.

### Mục dự phòng nếu cần thêm

B-2 (số ngày tràn ô) và A-6, A-7 (câu thông báo, múi giờ offset 0) cũng đã sửa và đo lại, nhưng lỗi được bắt trước khi commit nên chưa có commit làm bằng chứng. Xem "Nhật ký ứng viên" ở trên.

### Nhận xét về quy trình

Các lỗi trên đều do AI sinh ra trong những lượt viết code một task. Tách task nhỏ, mỗi lượt một task, giúp mỗi lỗi **lộ ra khi test đúng tầng của nó**: lỗi GET nằm ở form (S2), lỗi vị trí panel nằm ở bố cục, lỗi kiến trúc nằm ở nơi nối dây. Gộp tất cả vào một prompt thì ba lỗi này chồng lên nhau và khó chỉ ra lỗi nào thuộc commit nào.
