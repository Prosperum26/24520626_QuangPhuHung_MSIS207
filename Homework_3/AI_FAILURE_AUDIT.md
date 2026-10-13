# AI_FAILURE_AUDIT – Homework 3: Resilient Event Hub

> Báo cáo lỗi do AI gây ra, bắt được lúc review (đề yêu cầu ≥ 3 mục, mỗi mục có: mô tả lỗi, cách phát hiện, giải pháp đã refactor).
> Thêm hai trường để trung thực về quá trình: **Phương án** (các hướng sửa khả dĩ) và **Quyết định** (bạn chọn gì và vì sao).
> Quy tắc: chỉ ghi thứ **có thật trong code AI sinh ra**, kèm cách tái hiện. Không dựng lỗi để có cái mà sửa. Mỗi audit chạy ở chế độ review (`project-rules.md` §2.6): chỉ liệt kê, không sửa trong cùng lượt.

Trạng thái: **Audit A xong, mọi mục đã có quyết định (A-8 và A-9 giữ nguyên/chấp nhận, các mục còn lại đã sửa, chờ commit). S3 đã làm xong. Audit B chưa chạy.** Audit B chạy sau S3. Bản báo cáo cuối (≥ 3 mục) viết ở T-A3.

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

> Gợi ý khi viết bản cuối: mục có commit bằng chứng và có phương án thật sự đáng cân nhắc là A-1, A-2, A-4 (và A-3 nếu xác nhận được bằng tay).

---

## Audit B – hoàn thiện (chưa chạy)

Sẽ chạy sau T-08. Phạm vi: toàn trang, double-submit, XSS, CSP, a11y, Lighthouse, hồi quy các sửa của Audit A.

## Báo cáo cuối (T-A3)

Chọn ≥ 3 mục từ Audit A và B, viết lại theo mẫu: Mô tả lỗi, Cách phát hiện (kèm lệnh hoặc ảnh), Phương án, Quyết định, Giải pháp đã refactor (kèm commit và đoạn code trước/sau).
