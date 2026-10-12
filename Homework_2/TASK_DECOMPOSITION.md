# TASK_DECOMPOSITION – Homework 2: Drum Kit Engine (Contract-First)

> Work Breakdown Structure (WBS) cho HW2.
> File này được commit **trước** mọi code (`docs(spec)`), đúng quy tắc §6 của `project-rules.md`.
> Mỗi prompt AI tham chiếu **đúng 1** task ID (ví dụ `T-03-J`) và đính kèm `project-rules.md` + phần contract liên quan.
> **Luật của đề:** decoupling bắt buộc. HTML contract xong trước khi chạm JS; audio engine, keyboard listener, recorder là 3 module độc lập.

---

## 1. Mục tiêu và phạm vi

Một Drum Kit chơi bằng bàn phím, chia 4 bước theo đề:

| Bước | Nội dung | Module |
|---|---|---|
| 1 | Chốt **HTML `data-sound` contract** và commit trước khi viết JS | `index.html` |
| 2 | **Polyphonic** audio engine: nhiều tiếng chồng nhau, bấm lại khi tiếng cũ chưa hết vẫn phát | `js/audio-engine.js` |
| 3 | `keydown` listener, **throttle auto-repeat** bằng `event.repeat` | `js/keyboard-input.js` |
| 4 | **FIFO Beat Recorder**: hàng đợi sự kiện có timestamp, phát lại đúng nhịp | `js/beat-recorder.js` |

**Ngoài phạm vi:** nhạc cụ ngoài bộ trống, đổi bàn phím theo người dùng, lưu bản thu vào localStorage/server, xuất file audio, nút đổi theme.

**Yêu cầu thời gian:** phải refactor được trong ~3 phút lúc vấn đáp. Vì vậy mọi hằng số (phím, tên sound, ngưỡng) nằm ở **một chỗ** (xem 3.4), mỗi module thay được mà không đụng module còn lại.

---

## 2. Quy trình 4 bước áp dụng

| Bước | Áp dụng trong bài |
|---|---|
| 1. Functional Slicing | Chia theo tầng: contract (HTML) → engine → input → recorder → wiring |
| 2. Contract Definition | Chốt `data-key`, `data-sound`, API từng module, dạng event trong queue (mục 3) |
| 3. Atomic Generation | 1 prompt = 1 task ID = 1 file. Không prompt AI viết engine + input + recorder cùng lúc |
| 4. Contract Verification | Mỗi task có cổng kiểm tra riêng, test được bằng DevTools console (mục 5) |

---

## 3. Contract (chốt trước khi viết code)

### 3.1 HTML `data-sound` contract (bước 1)

Mỗi pad là một `<button>` (focus được, có tên truy cập), gắn với một `<audio>` qua `data-sound`:

```html
<main id="main-content">
  <h1>Drum Kit</h1>

  <ul class="pad-grid" aria-label="Drum pads">
    <li>
      <button type="button" class="drum-pad" data-key="a" data-sound="kick">
        <kbd>A</kbd> <span class="pad-label">Kick</span>
      </button>
    </li>
    … (mỗi pad một <li>)
  </ul>

  <!-- Toolbar recorder -->
  <ul class="recorder-bar" aria-label="Beat recorder">
    <li><button type="button" id="rec-start">Record</button></li>
    <li><button type="button" id="rec-stop" disabled>Stop</button></li>
    <li><button type="button" id="rec-play" disabled>Play</button></li>
  </ul>
  <p class="recorder-status" role="status"></p>

  <!-- Nguồn âm thanh, tách khỏi pad để engine chỉ đọc data-sound -->
  <audio data-sound="kick" src="assets/sounds/kick.wav" preload="auto"></audio>
  …
</main>
```

| Attribute | Nằm trên | Ý nghĩa | Quy tắc |
|---|---|---|---|
| `data-key` | `.drum-pad` | Giá trị `event.key` đã `toLowerCase()` | Duy nhất trong trang |
| `data-sound` | `.drum-pad` **và** `<audio>` | Khoá nối pad ↔ nguồn âm thanh | Mỗi `data-sound` trên pad phải có đúng 1 `<audio>` cùng giá trị |
| `data-playing` | `.drum-pad` (JS ghi) | Hiệu ứng nhấn, CSS đọc | JS chỉ ghi attribute, CSS đọc attribute |

Mọi thứ khác (tên class, id nút recorder) cũng khoá cứng ở đây; không đổi tên khi chưa hỏi.

### 3.2 API từng module (không import chéo)

```
        index.html (contract)
              │ đọc data-sound
              ▼
  keyboard-input ──▶ main.js ◀── beat-recorder
                       │
                       ▼
                 audio-engine
```

`main.js` là **chỗ duy nhất** biết cả ba module. Engine, input, recorder không import nhau.

| Module | API | Ghi chú |
|---|---|---|
| `audio-engine.js` | `init(root)`, `play(soundId)` | `init` quét `audio[data-sound]` một lần. `play` clone node hoặc tạo source mới mỗi lần gọi để chồng tiếng. Bắt `play().catch(...)`; `soundId` lạ thì bỏ qua êm |
| `keyboard-input.js` | `init(root, onHit)` | Gọi `onHit(soundId, el)` khi có hit hợp lệ. Không biết engine/recorder là gì |
| `beat-recorder.js` | `start()`, `stop()`, `record(soundId)`, `getQueue()`, `playback(onHit)`, `isRecording()` | Không phát âm thanh trực tiếp; phát lại bằng cách gọi `onHit` do `main.js` đưa vào |

### 3.3 Dạng event trong queue (bước 4)

```js
{ sound: 'kick', t: 1234 }   // t = ms kể từ lúc start(), lấy từ performance.now()
```

- FIFO: `record` ghi cuối queue, `playback` đi từ đầu queue (đúng thứ tự ghi).
- `t` tính từ mốc tuyệt đối `performance.now()` lúc `start()`, **không cộng dồn delta** (đúng tinh thần quy tắc timer của `project-rules.md` §5).
- `playback` lên lịch bằng `setTimeout(fn, ev.t)`; giữ mảng id timer để `stop()` huỷ sạch khi dừng giữa chừng.
- `start()` xoá queue cũ. `record()` khi chưa `start()` là no-op.

### 3.4 Config tập trung (cho đợt refactor 3 phút)

Một khối `CONFIG` ở đầu `main.js` (hoặc `config.js` nếu cần), gồm:

- tên attribute: `data-key`, `data-sound`, `data-playing`
- thời gian hiệu ứng nhấn (ms)
- tốc độ phát lại (hệ số nhân `t`, mặc định `1`)

Đổi attribute hoặc tốc độ chỉ sửa **một dòng**.

### 3.5 Cấu trúc file

```
Homework_2/
├── TASK_DECOMPOSITION.md
├── index.html                  ← T-01-H
├── assets/sounds/*.wav         ← T-01-A
├── css/
│   ├── tokens.css              ← T-01-C (màu trong :root, dark mode theo OS)
│   └── drum-kit.css            ← T-01-C (grid pad, trạng thái data-playing, focus-visible)
└── js/
    ├── audio-engine.js         ← T-02-J
    ├── keyboard-input.js       ← T-03-J
    ├── beat-recorder.js        ← T-04-J
    └── main.js                 ← T-05-J
```

Script nạp bằng `defer`, thứ tự: ba module → `main.js` cuối cùng. Không `<script>` inline.

---

## 4. Kế hoạch commit (6 commit)

| # | Commit | Task | File |
|---|---|---|---|
| 0 | `docs(spec): task decomposition for homework 2` | — | `Homework_2/TASK_DECOMPOSITION.md` |
| 1 | `feat(drumkit): add HTML data-sound contract` | T-01-H, T-01-C, T-01-A | `index.html`, `css/*`, `assets/sounds/*` |
| 2 | `feat(drumkit): polyphonic audio engine` | T-02-J | `js/audio-engine.js` |
| 3 | `feat(drumkit): keydown listener with repeat throttling` | T-03-J | `js/keyboard-input.js` |
| 4 | `feat(drumkit): FIFO beat recorder` | T-04-J | `js/beat-recorder.js` |
| 5 | `feat(drumkit): wire modules and recorder controls` | T-05-J | `js/main.js` (+ nối nút trong HTML nếu thiếu) |
| 6 | `refactor(drumkit): isolate modules and centralize config` | T-06 | các file `js/*` |

Commit 1 **không chứa JS**, đúng yêu cầu "commit contract trước khi chạm JavaScript".

---

## 5. Task list chi tiết

### T-01 – HTML contract (commit 1)

| ID | Việc | Cổng kiểm tra |
|---|---|---|
| T-01-H | `index.html` theo 3.1: skip-link, landmark, 1 `<h1>`, pad là `<button>`, `<audio data-sound>` tương ứng | Mỗi `data-sound` trên pad có đúng 1 `<audio>`; `data-key` không trùng; 0 `<div>`, 0 inline style/handler |
| T-01-C | `tokens.css` + `drum-kit.css`: grid `auto-fit minmax`, `[data-playing]` đổi nhẹ transform/viền, `:focus-visible`, `prefers-reduced-motion` | 375px không scroll ngang; contrast ≥ 4.5:1 sáng và tối; 0 hex ngoài `:root` |
| T-01-A | Âm thanh trong `assets/sounds/` | Mở từng file nghe được; tên file khớp `data-sound` |

### T-02-J – Polyphonic audio engine (commit 2)

- `init` gom nguồn âm thanh theo `data-sound` vào `Map`.
- `play(id)`: mỗi lần gọi tạo một instance mới (`cloneNode()` hoặc `AudioBufferSourceNode`), không `currentTime = 0` trên cùng một node (cách này cắt tiếng cũ, không polyphonic).
- Bắt rejection của `play()` (autoplay policy), không để lỗi `Uncaught (in promise)`.
- **Kiểm tra:** gọi `play('kick')` 5 lần liên tiếp trong console, nghe 5 tiếng chồng nhau; `play('xyz')` không ném lỗi.

### T-03-J – Keydown + `event.repeat` (commit 3)

- Một listener `keydown` ở `document`, dùng `event.key` (không `keyCode`/`keypress`/`which`).
- `if (event.repeat) return;` đứng **trước** mọi xử lý khác.
- Tra pad bằng map dựng sẵn từ `[data-key]`, hoặc `CSS.escape` nếu dùng `querySelector` (lỗi slide 23: phím như `"` hay `\` làm selector ném `SyntaxError`).
- Bỏ qua khi có `ctrlKey`/`metaKey`/`altKey` (không chặn phím tắt trình duyệt) và khi focus đang ở input/textarea.
- Click chuột / chạm vào pad cũng gọi `onHit` (cùng đường đi với bàn phím).
- Ghi `data-playing` lên pad, gỡ sau thời gian cấu hình hoặc ở `transitionend`.
- **Kiểm tra:** giữ một phím, `onHit` chỉ chạy 1 lần; gõ hai phím khác nhau liên tiếp vẫn chạy cả hai; bấm `"` không có lỗi console.

### T-04-J – FIFO Beat Recorder (commit 4)

- Theo 3.2 và 3.3. Không `import`/tham chiếu engine hay input.
- `playback` phát lại theo thứ tự ghi, đúng khoảng cách thời gian; bấm Stop huỷ mọi timer đang chờ.
- Chống bấm Play khi đang phát (không phát chồng hai lượt).
- **Kiểm tra:** `start()` → `record('kick')` → chờ 500ms → `record('snare')` → `stop()`; `getQueue()` ra 2 phần tử, `t` tăng dần, chênh nhau khoảng 500.

### T-05-J – Wiring (commit 5)

- `main.js`: `engine.init()`, `input.init(root, onHit)`, nút Record/Stop/Play.
- `onHit(soundId, el)` = `engine.play(soundId)`, rồi nếu `recorder.isRecording()` thì `recorder.record(soundId)`.
- Phát lại = `recorder.playback(soundId => engine.play(soundId))`. Hit lúc phát lại **không** được ghi ngược vào queue.
- Cập nhật `disabled` của nút và `.recorder-status` theo trạng thái (`idle | recording | playing`), một hàm `setMode` duy nhất.
- **Kiểm tra:** quy trình đầy đủ Record → gõ → Stop → Play nghe đúng nhịp; 0 lỗi console.

### T-06 – Refactor và audit (commit 6)

- Rà ranh giới: `grep` không thấy `audio-engine`, `keyboard-input`, `beat-recorder` import hay gọi nhau; chỉ `main.js` biết cả ba.
- Gom hằng số về `CONFIG` (3.4); xoá code chết.
- Thử 2 yêu cầu đổi nhanh như lúc vấn đáp: đổi một phím, và đổi tốc độ phát lại ×2. Mỗi việc ≤ 1 dòng sửa.

---

## 6. Cổng kiểm tra (Git Bash, từ thư mục gốc repo)

```bash
# 1. Cấm API cũ / pattern bị cấm
grep -rnE "keyCode|keypress|\.which|innerHTML|onclick=|\bvar " Homework_2 --include=*.js --include=*.html

# 2. Không có CDN, không inline style
grep -rnE "https?://(cdn|unpkg)|style=\"" Homework_2 --include=*.html

# 3. Module không phụ thuộc chéo (mỗi lệnh phải rỗng)
grep -nE "recorder|keyboard|KeyboardInput|BeatRecorder" Homework_2/js/audio-engine.js
grep -nE "recorder|engine|AudioEngine|BeatRecorder" Homework_2/js/keyboard-input.js
grep -nE "AudioEngine|audio-engine|keyboard|KeyboardInput|\.play\(" Homework_2/js/beat-recorder.js
```

Kiểm tay: 375px, chỉ dùng bàn phím (Tab tới pad, Enter/Space phát), Lighthouse Accessibility không có cảnh báo mới.

---

## 7. Definition of Done (mỗi task)

Áp dụng checklist ở `project-rules.md` §8, cộng thêm:

- [ ] Task chỉ chạm file trong danh sách của nó.
- [ ] Tên attribute / API đúng contract mục 3, không tự đặt thêm.
- [ ] Prompt và lỗi của AI được ghi vào `docs/` (prompt log).
- [ ] Commit đúng thông điệp ở mục 4; **AI không tự commit**, chỉ đề xuất.

---

## 8. Rủi ro và cách xử lý

| Rủi ro | Xử lý |
|---|---|
| Trình duyệt chặn autoplay, không ra tiếng ở lần bấm đầu | Chỉ phát từ sự kiện người dùng (keydown/click); bắt `play().catch` |
| Clone `<audio>` liên tục gây rò rỉ node | Gỡ clone ở sự kiện `ended`; nếu lag thì chuyển sang `AudioBufferSourceNode` (chỉ sửa `audio-engine.js`) |
| `setTimeout` trôi nhịp khi tab nền | Chấp nhận cho bài này; ghi vào phần hạn chế |
| Phím có chữ hoa khi Caps Lock / Shift | `event.key.toLowerCase()` trước khi tra map |
| Bấm Play khi queue rỗng | Nút Play `disabled` cho tới khi có ít nhất 1 event |

## 9. Câu hỏi mở (mặc định đã chọn, không chặn việc)

1. **Nguồn âm thanh:** mặc định dùng file `.wav` CC0 tự tải/tự ghi, đặt ở `assets/sounds/`, ghi nguồn trong README. Nếu không có file, đổi sang tổng hợp bằng Web Audio (chỉ sửa `audio-engine.js`).
2. **Số pad:** mặc định 9 pad (`a s d f g h j k l`), đủ cho bộ kick/snare/hihat/tom/clap/…; đổi trong HTML contract.
3. **Theme:** chỉ theo `prefers-color-scheme`, chưa làm nút chuyển.
