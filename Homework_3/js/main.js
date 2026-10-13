// Composition root: the only script that touches the DOM. It receives values from
// CONFIG and passes them to the pure modules. Countdown first, then the form.
(function () {
  'use strict';

  // ---- Countdown -----------------------------------------------------------

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
      timeEl.textContent = Format.startTime(targetMs);
    }

    let lastAnnounced = null;

    function render(values) {
      cells.days.textContent = Format.pad(values.days);
      cells.hours.textContent = Format.pad(values.hours);
      cells.minutes.textContent = Format.pad(values.minutes);
      cells.seconds.textContent = Format.pad(values.seconds);

      const slot = Math.floor(values.totalMs / 1000 / config.announceEverySeconds);
      if (slot !== lastAnnounced) {
        lastAnnounced = slot;
        statusEl.textContent = Format.announcement(values);
      }
    }

    // A hidden tab throttles timers; the value is always recomputed from the
    // absolute target, so we only need to refresh as soon as the tab is back.
    function onVisibility() {
      if (!document.hidden) handle.refresh();
    }

    // Back/forward can restore the page from the bfcache without a visibilitychange.
    function onPageShow(event) {
      if (event.persisted) handle.refresh();
    }

    function release() {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
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
      window.addEventListener('pageshow', onPageShow);
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
    let attemptKey = null;  // one key per registration attempt; a retry reuses it

    // CONFIG owns the limits; the HTML attributes are only the no-JS fallback.
    fields.name.maxLength = config.limits.nameMax;
    fields.email.maxLength = config.limits.emailMax;
    fields.note.maxLength = config.limits.noteMax;

    // Live "42/300" beside the note, counted in characters as people see them.
    const noteCount = form.querySelector('.field-count');
    function showNoteCount() {
      noteCount.textContent = `${Array.from(fields.note.value).length}/${config.limits.noteMax}`;
    }

    // The single place that writes #register[data-state] and what depends on it.
    function setState(next) {
      if (!FormMachine.STATES.includes(next)) {
        throw new TypeError(`setState: unknown form state "${next}"`);
      }
      root.dataset.state = next;
      const submitting = next === 'submitting';
      form.setAttribute('aria-busy', String(submitting));
      Object.values(fields).forEach((el) => { el.readOnly = submitting; });
      // aria-disabled, not disabled: the button keeps keyboard focus while it waits.
      submitBtn.setAttribute('aria-disabled', String(submitting));
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

    // What the visitor typed, untouched; Sanitize decides what is acceptable.
    function readRaw() {
      return { name: fields.name.value, email: fields.email.value, note: fields.note.value };
    }

    function render(next, cause) {
      if (next === root.dataset.state) return;
      setState(next);
      if (next === 'error') errorMsg.textContent = MESSAGES[cause] || MESSAGES.REJECT;
      if (next === 'success') {
        const when = Number.isNaN(targetMs) ? '' : ` See you on ${Format.startTime(targetMs)}.`;
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

      RegistrationApi.submit({ ...values, idempotencyKey: attemptKey }, {
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
      // Already sending (a second click, Enter, a double-tap): do nothing at all.
      if (machine.state === 'submitting') return;

      const result = Sanitize.validate(readRaw(), config.limits);
      Object.keys(fields).forEach((key) => showFieldError(key, result.errors[key]));
      // Show the visitor what will actually be sent if cleaning changed it.
      fields.name.value = result.values.name;
      fields.note.value = result.values.note;
      showNoteCount();

      const before = machine.state;
      const next = machine.dispatch('SUBMIT', { valid: result.ok });
      if (!result.ok) {
        const firstBad = Object.keys(fields).find((key) => result.errors[key]);
        fields[firstBad].focus();
        return;
      }
      if (next === 'submitting' && before !== 'submitting') {
        if (before === 'idle') attemptKey = RegistrationApi.newKey();
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
        submitBtn.focus(); // the Try again button just hid itself: keep focus in the form
        send(lastValues);
      }
    });

    // Editing after an error means the user wants to change something: back to idle.
    form.addEventListener('input', (event) => {
      const key = Object.keys(fields).find((k) => fields[k] === event.target);
      if (key) showFieldError(key, '');
      if (event.target === fields.note) showNoteCount();
      apply('EDIT');
    });

    showNoteCount();
    setState('idle');
  }

  initCountdown(CONFIG);
  initForm(CONFIG);
})();
