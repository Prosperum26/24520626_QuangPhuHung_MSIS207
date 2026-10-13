// Pure text helpers for the page: no DOM, no timers, so they can be tested alone.
// Public API: Format.pad, Format.plural, Format.startTime, Format.announcement.
const Format = (function () {
  'use strict';

  const LOCALE = 'en-GB';

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function plural(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
  }

  // True when the zone has no offset from UTC at that instant (UTC itself, or
  // London in winter), so a second "UTC" time would only repeat the first.
  function isZeroOffset(ms, timeZone) {
    const parts = new Intl.DateTimeFormat(LOCALE, { timeZone, timeZoneName: 'longOffset' }).formatToParts(ms);
    const zone = parts.find((part) => part.type === 'timeZoneName');
    // Engines spell a zero offset "GMT", "UTC" or "GMT+00:00".
    return Boolean(zone) && /^(?:GMT|UTC)(?:[+−-]0{1,2}(?::?00)?)?$/.test(zone.value);
  }

  // "20 December 2026 at 09:00 GMT+7 (20 Dec, 02:00 UTC)" in the visitor's zone.
  // timeZone is only passed by tests; undefined means the visitor's own zone.
  function startTime(ms, timeZone) {
    const local = new Intl.DateTimeFormat(LOCALE, {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      timeZoneName: 'short', timeZone,
    }).format(ms);
    if (isZeroOffset(ms, timeZone)) return local;
    const utc = new Intl.DateTimeFormat(LOCALE, {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      timeZoneName: 'short', timeZone: 'UTC',
    }).format(ms);
    return `${local} (${utc})`;
  }

  // One sentence for screen readers, coarse on purpose (see announceEverySeconds):
  // the seconds are dropped, so it says "about".
  function announcement(values) {
    if (values.totalMs < 60000) return 'Less than a minute left until the workshop starts.';
    return `About ${plural(values.days, 'day')}, ${plural(values.hours, 'hour')} and ${plural(values.minutes, 'minute')} left until the workshop starts.`;
  }

  return { pad, plural, startTime, announcement };
})();
