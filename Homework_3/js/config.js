// The single place to change the event, timing and limits. Loaded first (defer);
// the other scripts receive what they need from main.js, they do not read this directly.
const CONFIG = Object.freeze({
  eventName: 'Ocean Guardians Workshop',
  eventStartUtc: '2026-12-20T02:00:00Z',   // UTC ISO 8601, always ends in Z
  announceEverySeconds: 60,                // how often a screen reader hears the countdown
  submitTimeoutMs: 8000,
  mockDelayMs: 1200,
  mockOutcome: 'success',                  // 'success' | 'error'
  limits: Object.freeze({ nameMax: 80, emailMax: 254, noteMax: 300 }),
});
