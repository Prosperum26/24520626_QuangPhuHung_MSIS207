// Composition root: the only script that touches the DOM. It receives values from
// CONFIG and passes them to the pure modules. The countdown part is below.
(function () {
  'use strict';

  const LOCALE = 'en-GB';

  // ---- Countdown -----------------------------------------------------------

  function plural(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  // "20 December 2026 at 09:00 GMT+7 (20 Dec, 02:00 UTC)" in the visitor's zone.
  // timeZone is only passed by tests; undefined means the visitor's own zone.
  function formatStart(ms, timeZone) {
    const local = new Intl.DateTimeFormat(LOCALE, {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      timeZoneName: 'short', timeZone,
    }).format(ms);
    if (local.includes('UTC')) return local;
    const utc = new Intl.DateTimeFormat(LOCALE, {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      timeZoneName: 'short', timeZone: 'UTC',
    }).format(ms);
    return `${local} (${utc})`;
  }

  // One sentence for screen readers, coarse on purpose (see announceEverySeconds).
  function announcement(values) {
    if (values.totalMs < 60000) return 'Less than a minute left until the workshop starts.';
    return `${plural(values.days, 'day')}, ${plural(values.hours, 'hour')} and ${plural(values.minutes, 'minute')} left until the workshop starts.`;
  }

  function initCountdown(config) {
    const root = document.querySelector('#countdown');
    const cells = {
      days: document.querySelector('#cd-days'),
      hours: document.querySelector('#cd-hours'),
      minutes: document.querySelector('#cd-minutes'),
      seconds: document.querySelector('#cd-seconds'),
    };
    const timeEl = root.querySelector('.countdown-time');
    const statusEl = root.querySelector('.countdown-status');

    // The single place that writes the countdown state (JS writes it, CSS reads it).
    function setState(next) {
      root.dataset.state = next;
    }

    // The static datetime in the HTML is only a no-JS fallback; CONFIG is the truth.
    const targetMs = Countdown.parseTarget(config.eventStartUtc);
    if (!Number.isNaN(targetMs)) {
      timeEl.setAttribute('datetime', config.eventStartUtc);
      timeEl.textContent = formatStart(targetMs);
    }

    let lastAnnounced = null;

    function render(values) {
      cells.days.textContent = pad(values.days);
      cells.hours.textContent = pad(values.hours);
      cells.minutes.textContent = pad(values.minutes);
      cells.seconds.textContent = pad(values.seconds);

      const slot = Math.floor(values.totalMs / 1000 / config.announceEverySeconds);
      if (slot !== lastAnnounced) {
        lastAnnounced = slot;
        statusEl.textContent = announcement(values);
      }
    }

    // A hidden tab throttles timers; the value is always recomputed from the
    // absolute target, so we only need to refresh as soon as the tab is back.
    function onVisibility() {
      if (!document.hidden) handle.refresh();
    }

    function release() {
      document.removeEventListener('visibilitychange', onVisibility);
    }

    const handle = Countdown.start({
      targetIso: config.eventStartUtc,
      onTick: render,
      onDone() {
        release();
        setState('done');
        statusEl.textContent = 'The workshop has started.';
      },
      onInvalid() {
        release();
        setState('invalid');
      },
    });

    // Only listen while there is something left to count.
    if (root.dataset.state === 'running') {
      document.addEventListener('visibilitychange', onVisibility);
    }
  }

  initCountdown(CONFIG);
})();
