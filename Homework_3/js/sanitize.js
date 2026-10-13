// Input cleaning and validation. Pure: strings in, strings and error messages out.
// Public API: Sanitize.cleanName, cleanNote, cleanEmail, validate(raw, limits).
//
// Policy: clean at the boundary, encode at the output.
//  - name and note are normalised (Unicode NFC, invisible and control characters
//    removed, whitespace collapsed). Markup characters are NOT stripped: they are
//    harmless text, and the page only ever shows them through textContent.
//  - email is never rewritten. If it is not a plain address it is rejected, because
//    silently "fixing" an address could send a confirmation to the wrong person.
const Sanitize = (function () {
  'use strict';

  // Zero-width, bidirectional override/isolate and soft-hyphen characters: invisible,
  // and they let one string display as another (for example a reversed name).
  const INVISIBLE = /[­​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;
  const HAS_INVISIBLE = /[­​-‏‪-‮⁠-⁤⁦-⁩﻿]/;
  const CONTROL = /\p{Cc}/gu;               // includes tab and newline
  const HAS_CONTROL = /\p{Cc}/u;
  const CONTROL_EXCEPT_NEWLINE = /[^\P{Cc}\n]/gu;

  const EMAIL_LOCAL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
  const EMAIL_DOMAIN = /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

  function text(value) {
    return typeof value === 'string' ? value : '';
  }

  function length(value) {
    return Array.from(value).length; // code points, so an emoji counts as one
  }

  function cleanName(value) {
    return text(value)
      .normalize('NFC')
      .replace(CONTROL, ' ')
      .replace(INVISIBLE, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // A note may span lines, so newlines survive; everything else is tidied like a name.
  function cleanNote(value) {
    return text(value)
      .normalize('NFC')
      .replace(/\r\n?/g, '\n')
      .replace(/\t/g, ' ')              // a tab separates words, so it must not just vanish
      .replace(INVISIBLE, '')
      .replace(CONTROL_EXCEPT_NEWLINE, '')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/ ?\n ?/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Only trims the ends. Anything odd inside is left for isEmail to reject.
  function cleanEmail(value) {
    return text(value).trim();
  }

  function isEmail(value, max) {
    if (HAS_CONTROL.test(value) || HAS_INVISIBLE.test(value)) return false;
    if (value.length > max) return false;
    const at = value.lastIndexOf('@');
    if (at < 1) return false;
    const local = value.slice(0, at);
    const domain = value.slice(at + 1);
    return local.length <= 64 && EMAIL_LOCAL.test(local) && EMAIL_DOMAIN.test(domain);
  }

  // raw: { name, email, note } as typed. Returns every problem at once.
  function validate(raw, limits) {
    const values = {
      name: cleanName(raw.name),
      email: cleanEmail(raw.email),
      note: cleanNote(raw.note),
    };
    const errors = {};

    if (!values.name) errors.name = 'Enter your name.';
    else if (!/\p{L}/u.test(values.name)) errors.name = 'Use letters in your name.';
    else if (length(values.name) > limits.nameMax) errors.name = `Use ${limits.nameMax} characters or fewer.`;

    if (!values.email) errors.email = 'Enter your email address.';
    else if (!isEmail(values.email, limits.emailMax)) errors.email = 'Enter a valid email address, like name@example.com.';

    if (length(values.note) > limits.noteMax) errors.note = `Use ${limits.noteMax} characters or fewer.`;

    return { ok: Object.keys(errors).length === 0, values, errors };
  }

  return { cleanName, cleanNote, cleanEmail, validate };
})();
