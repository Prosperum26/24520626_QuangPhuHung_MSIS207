# Homework 2: Drum Kit Engine

A keyboard-playable drum kit with nine pads and a FIFO beat recorder. Vanilla HTML, CSS and JavaScript, no dependencies.

## Run

Serve the folder with Live Server and open `http://localhost:5500/Homework_2/` (do not open the file with `file:///`).

Press `A S D F G H J K L` or tap a pad. Press Record, play a pattern, press Stop, then Play to hear it back.

## Architecture

```
index.html (data-key / data-sound contract)
      │
keyboard-input ──▶ main.js ◀── beat-recorder
                      │
                 audio-engine
```

| File | Job | Public API |
|---|---|---|
| `js/audio-engine.js` | Polyphonic playback: every hit plays a fresh clone of the `<audio>` source | `init(root, { soundAttr })`, `play(soundId)` |
| `js/keyboard-input.js` | `keydown` (with `event.repeat` throttle) and pad clicks become hits | `init(root, onHit, { keyAttr, soundAttr, playingAttr, playingMs })` |
| `js/beat-recorder.js` | FIFO queue of `{ sound, t }`, replayed with `setTimeout` | `start`, `stop`, `record`, `getQueue`, `playback(onHit, { speed, onEnd })`, `isRecording` |
| `js/main.js` | The only file that knows all three; owns `CONFIG` and `setMode` | none |

The three modules never reference each other. `main.js` connects them.

## Quick changes

| Change | Edit |
|---|---|
| Rebind a pad's key | `data-key` on that pad in `index.html` (the visible key label follows it) |
| Replay speed | `playbackSpeed` in `CONFIG`, `js/main.js` |
| Pad highlight time | `playingMs` in `CONFIG`, `js/main.js` |
| Rename a data attribute | the matching entry in `CONFIG`, plus the attribute in `index.html` |

## Known limits

- Replay uses `setTimeout`, so timing can drift by a few milliseconds, and more in a background tab.
- Replayed hits do not flash the pads; only live hits do.
- The theme follows the OS (`prefers-color-scheme`); there is no manual toggle.
- The first sound can lag slightly because each hit clones the `<audio>` element.

## Credits

Samples are synthesized for this project. See `assets/sounds/README.md`.
