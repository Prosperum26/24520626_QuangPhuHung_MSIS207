// Stand-in for a registration backend (no server in this project). It waits
// mockDelayMs, then succeeds or fails according to mockOutcome, and honours an
// AbortSignal so a timed-out request really stops. Like a real server it also
// remembers idempotency keys: a repeat of an accepted key is acknowledged as a
// duplicate instead of being registered twice.
// Public API: RegistrationApi.newKey(), RegistrationApi.submit(payload, { signal, mockOutcome, mockDelayMs })
const RegistrationApi = (function () {
  'use strict';

  const accepted = new Set();   // idempotency keys this "server" has already taken

  function abortError() {
    return new DOMException('The request was aborted.', 'AbortError');
  }

  // A random UUID v4. randomUUID needs a secure context; the fallback does not.
  function newKey() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // payload: { name, email, note, idempotencyKey }
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
        if (mockOutcome === 'error') {
          reject(new Error('Registration failed.'));
          return;
        }
        const duplicate = accepted.has(payload.idempotencyKey);
        accepted.add(payload.idempotencyKey);
        resolve({ ok: true, duplicate });
      }, mockDelayMs);

      if (signal) signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  return { newKey, submit };
})();
