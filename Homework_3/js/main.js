// Composition root: the only script that touches the DOM. It receives values from
// CONFIG and passes them to the pure modules. Countdown first, then the form.
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

  // ---- Registration form ---------------------------------------------------

  const DEMO_OUTCOMES = ['success', 'error'];
  const BUTTON_LABEL = { submitting: 'Sending…' };
  const MESSAGES = {
    REJECT: "We couldn't send your registration. Check your connection, then try again.",
    TIMEOUT: 'Sending took too long. Check your connection, then try again.',
  };

  // ?demo=error forces a failure on stage; only whitelisted values are honoured.
  function pickOutcome(configOutcome) {
    const demo = new URLSearchParams(location.search).get('demo');
    return DEMO_OUTCOMES.includes(demo) ? demo : configOutcome;
  }

  function initForm(config) {
    const root = document.querySelector('#register');
    const form = root.querySelector('#reg-form');
    const fields = {
      name: form.querySelector('#reg-name'),
      email: form.querySelector('#reg-email'),
      note: form.querySelector('#reg-note'),
    };
    const submitBtn = form.querySelector('#reg-submit');
    const statusEl = form.querySelector('.reg-status');
    const errorMsg = root.querySelector('.reg-error-message');
    const retryBtn = root.querySelector('.reg-retry');
    const successTitle = root.querySelector('#reg-success-title');
    const successMsg = root.querySelector('.reg-success-message');
    const targetMs = Countdown.parseTarget(config.eventStartUtc);

    const machine = FormMachine.create('idle');
    const outcome = pickOutcome(config.mockOutcome);
    let lastValues = null;

    // CONFIG owns the limits; the HTML attributes are only the no-JS fallback.
    fields.name.maxLength = config.limits.nameMax;
    fields.email.maxLength = config.limits.emailMax;
    fields.note.maxLength = config.limits.noteMax;

    // The single place that writes #register[data-state] and what depends on it.
    function setState(next) {
      root.dataset.state = next;
      const submitting = next === 'submitting';
      form.setAttribute('aria-busy', String(submitting));
      Object.values(fields).forEach((el) => { el.readOnly = submitting; });
      submitBtn.textContent = BUTTON_LABEL[next] || 'Register';
      statusEl.textContent = submitting ? 'Sending your registration…' : '';
    }

    function showFieldError(key, message) {
      const el = fields[key];
      const out = form.querySelector(`#reg-${key}-error`);
      out.textContent = message || '';
      if (message) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    }

    // Reads the form and reports every problem at once.
    function validate() {
      const values = {
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        note: fields.note.value.trim(),
      };
      const errors = {};
      if (!values.name) errors.name = 'Enter your name.';
      if (!values.email) errors.email = 'Enter your email address.';
      else if (fields.email.validity.typeMismatch) errors.email = 'Enter a valid email address, like name@example.com.';
      return { ok: Object.keys(errors).length === 0, values, errors };
    }

    function render(next, cause) {
      if (next === root.dataset.state) return;
      setState(next);
      if (next === 'error') errorMsg.textContent = MESSAGES[cause] || MESSAGES.REJECT;
      if (next === 'success') {
        const when = Number.isNaN(targetMs) ? '' : ` See you on ${formatStart(targetMs)}.`;
        successMsg.textContent = `Thanks, ${lastValues.name}. Your registration is confirmed.${when}`;
        successTitle.focus();
      }
    }

    function apply(type, detail) {
      render(machine.dispatch(type, detail), type);
    }

    function send(values) {
      const id = machine.requestId;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        apply('TIMEOUT', { requestId: id });
      }, config.submitTimeoutMs);

      RegistrationApi.submit(values, {
        signal: controller.signal,
        mockOutcome: outcome,
        mockDelayMs: config.mockDelayMs,
      }).then(
        () => apply('RESOLVE', { requestId: id }),
        (err) => { if (err.name !== 'AbortError') apply('REJECT', { requestId: id }); },
      ).finally(() => clearTimeout(timeoutId));
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const result = validate();
      Object.keys(fields).forEach((key) => showFieldError(key, result.errors[key]));
      const before = machine.state;
      const next = machine.dispatch('SUBMIT', { valid: result.ok });
      if (!result.ok) {
        const firstBad = Object.keys(fields).find((key) => result.errors[key]);
        fields[firstBad].focus();
        return;
      }
      if (next === 'submitting' && before !== 'submitting') {
        lastValues = result.values;
        setState(next);
        send(result.values);
      }
    });

    // Same data as the failed attempt: no need to type it again.
    retryBtn.addEventListener('click', () => {
      const before = machine.state;
      const next = machine.dispatch('RETRY');
      if (next === 'submitting' && before !== 'submitting') {
        setState(next);
        send(lastValues);
      }
    });

    // Editing after an error means the user wants to change something: back to idle.
    form.addEventListener('input', (event) => {
      const key = Object.keys(fields).find((k) => fields[k] === event.target);
      if (key) showFieldError(key, '');
      apply('EDIT');
    });

    setState('idle');
  }

  initCountdown(CONFIG);
  initForm(CONFIG);
})();
