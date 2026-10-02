/* ==========================================================================
   T-03-5J – Contact Form Controller
   Contract: Exercise_3/TASK_DECOMPOSITION.md §3.7
   - State: #contact-form[data-state] = idle | invalid | submitting | success | error
   - Field errors: aria-invalid + #<id>-error text, messages from ValidityState
   - Adapter: mailto: link built with encodeURIComponent (never "Message sent":
     the page cannot know whether the email was actually sent)
   - Without JS the form still works: native validation + action="mailto:".
   ========================================================================== */

const initContactForm = () => {
  const form = document.querySelector('#contact-form');
  const submitButton = form?.querySelector('.form-submit');
  const status = form?.querySelector('#contact-status');

  if (!form || !submitButton || !status) {
    return;
  }

  // Mail clients may silently cut longer links; Vietnamese text encodes to
  // 6–9 characters per letter, so even 500 characters can go over.
  const MAX_MAILTO_LENGTH = 2000;
  const recipient = form.getAttribute('action').replace(/^mailto:/, '');
  const forceFail = /[?&]form=fail(&|$)/.test(window.location.search); // demo hook

  const fields = [...form.querySelectorAll('input, textarea')];
  const nameField = form.querySelector('#contact-name');
  const emailField = form.querySelector('#contact-email');
  const messageField = form.querySelector('#contact-message');

  const STATUS_TEXT = {
    success: `Your email app should open with your message. If it doesn't, email me at ${recipient}.`,
    tooLong: `Your message is too long to open in an email app. Please shorten it, or email me directly at ${recipient}.`,
    failed: `Couldn't open your email app. Please email me directly at ${recipient}.`,
  };

  // JS takes over the error UI; native bubbles stay as the no-JS fallback.
  form.noValidate = true;

  /* --- Field validation ------------------------------------------------- */

  const messageFor = (field) => {
    const { validity } = field;
    const label = field.labels[0]?.textContent ?? 'This field';

    if (validity.valueMissing) {
      return `${label} is required.`;
    }
    if (validity.typeMismatch) {
      return 'Enter a valid email address, like name@example.com.';
    }
    if (validity.tooShort) {
      return `${label} needs at least ${field.minLength} characters (now ${field.value.length}).`;
    }
    if (validity.tooLong) {
      return `${label} can be at most ${field.maxLength} characters.`;
    }
    return `Check the ${label.toLowerCase()} field.`;
  };

  const validateField = (field) => {
    const error = document.getElementById(`${field.id}-error`);
    const valid = field.validity.valid;

    if (valid) {
      field.removeAttribute('aria-invalid');
    } else {
      field.setAttribute('aria-invalid', 'true');
    }
    if (error) {
      error.textContent = valid ? '' : messageFor(field);
    }
    return valid;
  };

  /* --- State ------------------------------------------------------------ */

  const setState = (next, text = '') => {
    form.dataset.state = next;
    submitButton.disabled = next === 'submitting'; // no double submit

    // Errors interrupt (alert); everything else is announced politely.
    status.setAttribute('role', next === 'error' ? 'alert' : 'status');
    status.textContent = text;
  };

  const buildMailto = () => {
    const name = nameField.value.trim();
    const subject = `Portfolio contact from ${name}`;
    const body = `${messageField.value.trim()}\r\n\r\n— ${name} <${emailField.value.trim()}>`;

    // encodeURIComponent turns spaces into %20; URLSearchParams would use "+",
    // which many mail clients show literally.
    return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  /* --- Events ----------------------------------------------------------- */

  // Leaving a field the user has typed in marks it as touched.
  form.addEventListener('focusout', (event) => {
    const field = event.target;
    if (!fields.includes(field)) {
      return;
    }
    if (field.value !== '') {
      field.dataset.touched = 'true';
    }
    if (field.dataset.touched === 'true') {
      validateField(field);
    }
  });

  // Re-check only the field being edited, and only once it has been touched,
  // so errors clear as soon as they are fixed but never appear mid-typing.
  form.addEventListener('input', (event) => {
    const field = event.target;
    if (fields.includes(field) && field.dataset.touched === 'true') {
      validateField(field);
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (form.dataset.state === 'submitting') {
      return;
    }

    fields.forEach((field) => {
      field.dataset.touched = 'true';
    });

    const invalidFields = fields.filter((field) => !validateField(field));
    if (invalidFields.length > 0) {
      setState('invalid');
      invalidFields[0].focus();
      return;
    }

    setState('submitting');
    const url = buildMailto();

    if (url.length > MAX_MAILTO_LENGTH) {
      setState('error', STATUS_TEXT.tooLong);
      return;
    }
    if (forceFail) {
      setState('error', STATUS_TEXT.failed);
      return;
    }

    try {
      window.location.href = url;
      // The form is NOT reset: if no mail app opens, the text is still here.
      setState('success', STATUS_TEXT.success);
    } catch {
      setState('error', STATUS_TEXT.failed);
    }
  });
};

initContactForm();
