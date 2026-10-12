// Turns key presses and pad clicks into hits. Knows only the HTML contract
// (data-key / data-sound), not what a hit does: it reports each one to the
// callback. Public API: KeyboardInput.init(root, onHit, options?).
(function () {
  'use strict';

  const DEFAULTS = {
    keyAttr: 'data-key',
    soundAttr: 'data-sound',
    playingAttr: 'data-playing',
    playingMs: 120,
  };

  // Typing targets: never steal their keystrokes.
  const EDITABLE = 'input, textarea, select, [contenteditable]';

  let teardown = null;

  function init(root, onHit, options = {}) {
    if (typeof onHit !== 'function') {
      throw new TypeError('KeyboardInput.init(root, onHit): onHit must be a function');
    }
    if (teardown) teardown();

    const { keyAttr, soundAttr, playingAttr, playingMs } = { ...DEFAULTS, ...options };
    const pads = new Map();
    const timers = new WeakMap();

    root.querySelectorAll(`[${keyAttr}][${soundAttr}]`).forEach((pad) => {
      const key = pad.getAttribute(keyAttr).toLowerCase();
      if (!pads.has(key)) pads.set(key, pad);
    });

    function hit(pad) {
      // Re-hit restarts the highlight instead of letting an old timer cut it short.
      clearTimeout(timers.get(pad));
      pad.setAttribute(playingAttr, '');
      timers.set(pad, setTimeout(() => pad.removeAttribute(playingAttr), playingMs));
      onHit(pad.getAttribute(soundAttr), pad);
    }

    function onKeydown(event) {
      if (event.repeat) return;
      if (typeof event.key !== 'string') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest(EDITABLE)) return;

      const pad = pads.get(event.key.toLowerCase());
      if (pad) hit(pad);
    }

    function onClick(event) {
      const pad = event.target instanceof Element
        ? event.target.closest(`[${keyAttr}][${soundAttr}]`)
        : null;
      if (pad && root.contains(pad)) hit(pad);
    }

    document.addEventListener('keydown', onKeydown);
    root.addEventListener('click', onClick);

    teardown = () => {
      document.removeEventListener('keydown', onKeydown);
      root.removeEventListener('click', onClick);
      pads.forEach((pad) => {
        clearTimeout(timers.get(pad));
        pad.removeAttribute(playingAttr);
      });
      teardown = null;
    };
  }

  window.KeyboardInput = { init };
})();
