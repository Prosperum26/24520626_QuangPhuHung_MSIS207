// Polyphonic audio engine. Reads <audio data-sound> sources, knows nothing about
// keyboards, recorders or main.js. Public API: AudioEngine.init(root, { soundAttr }), AudioEngine.play(soundId).
(function () {
  'use strict';

  const sources = new Map();

  // Release the clone's media resource; safe to call more than once.
  function dispose(clone) {
    clone.removeAttribute('src');
    clone.load();
  }

  function init(root, options) {
    const { soundAttr } = options || {};
    if (!soundAttr) throw new TypeError('AudioEngine.init: options { soundAttr } is required');
    sources.clear();
    root.querySelectorAll(`audio[${soundAttr}]`).forEach((audio) => {
      const id = audio.getAttribute(soundAttr);
      if (!id || sources.has(id)) return;
      sources.set(id, audio);
    });
  }

  // Returns true if a new instance started playing, false if it was skipped.
  function play(soundId) {
    const source = sources.get(soundId);
    if (!source) return false;

    // A fresh node per call: overlapping hits never share currentTime.
    const clone = source.cloneNode(true);
    clone.addEventListener('ended', () => dispose(clone), { once: true });
    clone.addEventListener('error', () => dispose(clone), { once: true });

    const started = clone.play();
    if (started !== undefined) {
      started.catch(() => dispose(clone));
    }
    return true;
  }

  window.AudioEngine = { init, play };
})();
