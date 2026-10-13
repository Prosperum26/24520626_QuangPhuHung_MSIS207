// Stand-in for a registration backend (no server in this project). It waits
// mockDelayMs, then succeeds or fails according to mockOutcome, and honours an
// AbortSignal so a timed-out request really stops.
// Public API: RegistrationApi.submit(payload, { signal, mockOutcome, mockDelayMs }) -> Promise
const RegistrationApi = (function () {
  'use strict';

  function abortError() {
    return new DOMException('The request was aborted.', 'AbortError');
  }

  function submit(payload, { signal, mockOutcome = 'success', mockDelayMs = 1000 } = {}) {
    return new Promise((resolve, reject) => {
      if (signal && signal.aborted) {
        reject(abortError());
        return;
      }

      function onAbort() {
        clearTimeout(timerId);
        reject(abortError());
      }

      const timerId = setTimeout(() => {
        if (signal) signal.removeEventListener('abort', onAbort);
        if (mockOutcome === 'error') reject(new Error('Registration failed.'));
        else resolve({ ok: true });
      }, mockDelayMs);

      if (signal) signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  return { submit };
})();
