// FIFO beat recorder: a timestamped event queue. It stores and replays hits but
// never produces sound itself; playback reports each hit to a callback.
// Public API: BeatRecorder.start / stop / record / getQueue / playback / isRecording / isPlaying.
(function () {
  'use strict';

  let queue = [];          // [{ sound, t }], oldest first
  let recording = false;
  let startedAt = 0;       // performance.now() when start() was called
  let timers = [];         // pending playback timeout ids
  let playing = false;

  function cancelPlayback() {
    timers.forEach(clearTimeout);
    timers = [];
    playing = false;
  }

  // Begins a new take: the previous queue is discarded.
  function start() {
    cancelPlayback();
    queue = [];
    recording = true;
    startedAt = performance.now();
  }

  // Ends recording and/or cancels every pending playback timer. Keeps the queue.
  function stop() {
    recording = false;
    cancelPlayback();
  }

  // t is measured from the absolute start mark, never accumulated from deltas.
  function record(soundId) {
    if (!recording) return;
    queue.push({ sound: soundId, t: Math.round(performance.now() - startedAt) });
  }

  // Copy, so callers cannot reorder or mutate the stored queue.
  function getQueue() {
    return queue.map((event) => ({ ...event }));
  }

  // Replays the queue in recorded order. Returns false when nothing was scheduled.
  // options.speed scales time (2 = twice as fast); options.onEnd runs once when
  // playback finishes by itself (not when stop() cancels it).
  function playback(onHit, { speed = 1, onEnd } = {}) {
    if (typeof onHit !== 'function') return false;
    if (recording || playing || queue.length === 0) return false;
    if (!(speed > 0)) return false;

    const events = getQueue();
    playing = true;

    events.forEach((event, index) => {
      const isLast = index === events.length - 1;
      timers.push(setTimeout(() => {
        try {
          onHit(event.sound);
        } finally {
          if (isLast) {
            timers = [];
            playing = false;
            if (typeof onEnd === 'function') onEnd();
          }
        }
      }, event.t / speed));
    });
    return true;
  }

  function isRecording() {
    return recording;
  }

  function isPlaying() {
    return playing;
  }

  window.BeatRecorder = { start, stop, record, getQueue, playback, isRecording, isPlaying };
})();
