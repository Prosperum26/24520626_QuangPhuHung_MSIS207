// Drift-free countdown engine. Pure core: it never touches the DOM. Each tick
// re-reads the clock and compares it with an absolute UTC target; nothing is
// ever decremented, so a late or throttled timer cannot make the display drift.
// Limit (accepted): the clock is the visitor's own, so a device set to the wrong
// time counts down wrongly even though the UTC target is right.
// Public API: Countdown.parseTarget, Countdown.remaining, Countdown.start.
const Countdown = (function () {
  'use strict';

  // Strict UTC ISO 8601: must end in Z. A string without an offset would be
  // read as local time by Date.parse, which is exactly the timezone bug we avoid.
  const ISO_UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?Z$/;
  const SLACK_MS = 5;      // fire just after a second boundary, never just before it
  let active = null;       // the one running countdown, so start() can replace it

  // Returns the target as epoch milliseconds, or NaN for anything that is not a
  // real UTC instant (missing Z, 2026-02-31, non-string...).
  function parseTarget(iso) {
    if (typeof iso !== 'string') return NaN;
    const match = ISO_UTC.exec(iso);
    if (!match) return NaN;
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return NaN;
    // Date rolls 2026-02-31 over to March; reject any date that does not round-trip.
    return new Date(ms).toISOString().slice(0, 19) === iso.slice(0, 19) ? ms : NaN;
  }

  // Seconds are rounded up, so the display reaches 0 exactly when the target
  // does and never shows 00:00:00:00 while the event has not started.
  function remaining(targetMs, nowMs) {
    const totalMs = targetMs - nowMs;
    if (!(totalMs > 0)) {
      return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
    }
    const total = Math.ceil(totalMs / 1000);
    return {
      done: false,
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
      totalMs,
    };
  }

  // start({ targetIso, onTick, onDone, onInvalid, now? }) -> { stop, refresh }
  //   onTick(values)  every time the displayed second changes
  //   onDone()        once, when the target is reached (or already past)
  //   onInvalid()     once, when targetIso is not a valid UTC instant; no timer starts
  //   now             clock source, defaults to () => Date.now() (injectable for tests)
  // refresh() re-reads the clock immediately; use it after a tab becomes visible.
  function start({ targetIso, onTick, onDone, onInvalid, now = () => Date.now() }) {
    if (active) active.stop();

    const targetMs = parseTarget(targetIso);
    let timerId = null;
    let stopped = false;

    function stop() {
      stopped = true;
      clearTimeout(timerId);
      timerId = null;
      if (active === handle) active = null;
    }

    function tick() {
      clearTimeout(timerId);
      timerId = null;
      if (stopped) return;

      const nowMs = now();
      const values = remaining(targetMs, nowMs);
      if (values.done) {
        stop();
        if (onDone) onDone();
        return;
      }
      try {
        if (onTick) onTick(values);
      } finally {
        // Aim at the next second boundary of the *target*, from a fresh clock reading.
        if (!stopped) {
          const delay = (targetMs - now()) % 1000 || 1000;
          timerId = setTimeout(tick, delay + SLACK_MS);
        }
      }
    }

    const handle = { stop, refresh: tick };

    if (Number.isNaN(targetMs)) {
      stopped = true;
      if (onInvalid) onInvalid();
      return handle;
    }

    active = handle;
    tick();
    return handle;
  }

  return { parseTarget, remaining, start };
})();
