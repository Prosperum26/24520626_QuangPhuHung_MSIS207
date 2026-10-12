// Composition root: the only file that knows AudioEngine, KeyboardInput and BeatRecorder.
// Everything a live-defense change might touch lives in CONFIG.
(function () {
  'use strict';

  const CONFIG = {
    keyAttr: 'data-key',
    soundAttr: 'data-sound',
    playingAttr: 'data-playing',
    playingMs: 120,       // pad highlight duration
    playbackSpeed: 1,     // 2 = replay twice as fast
  };

  const startBtn = document.querySelector('#rec-start');
  const stopBtn = document.querySelector('#rec-stop');
  const playBtn = document.querySelector('#rec-play');
  const statusEl = document.querySelector('.recorder-status');

  // The single place that writes button state and status text.
  function setMode(mode) {
    const hasBeat = BeatRecorder.getQueue().length > 0;
    const idle = mode === 'idle';

    startBtn.disabled = !idle;
    stopBtn.disabled = idle;
    playBtn.disabled = !(idle && hasBeat);

    if (mode === 'recording') {
      statusEl.textContent = 'Recording… play some pads, then press Stop.';
    } else if (mode === 'playing') {
      statusEl.textContent = 'Playing your beat…';
    } else {
      statusEl.textContent = hasBeat
        ? `Beat ready: ${BeatRecorder.getQueue().length} hits. Press Play to hear it.`
        : '';
    }

    // A pressed button may just have disabled itself; keep keyboard focus in the bar.
    if (document.activeElement && document.activeElement.disabled) {
      const next = idle ? (playBtn.disabled ? startBtn : playBtn) : stopBtn;
      next.focus();
    }
  }

  // Live hit (keyboard or click): sound it, and keep it only while recording.
  function onHit(soundId) {
    AudioEngine.play(soundId);
    if (BeatRecorder.isRecording()) BeatRecorder.record(soundId);
  }

  // Replayed hit: sound only. Never routed through onHit, so it is never re-recorded.
  function onReplay(soundId) {
    AudioEngine.play(soundId);
  }

  startBtn.addEventListener('click', () => {
    BeatRecorder.start();
    setMode('recording');
  });

  stopBtn.addEventListener('click', () => {
    BeatRecorder.stop();
    setMode('idle');
  });

  playBtn.addEventListener('click', () => {
    const started = BeatRecorder.playback(onReplay, {
      speed: CONFIG.playbackSpeed,
      onEnd: () => setMode('idle'),
    });
    if (started) setMode('playing');
  });

  AudioEngine.init(document);
  KeyboardInput.init(document, onHit, {
    keyAttr: CONFIG.keyAttr,
    soundAttr: CONFIG.soundAttr,
    playingAttr: CONFIG.playingAttr,
    playingMs: CONFIG.playingMs,
  });
  setMode('idle');
})();
