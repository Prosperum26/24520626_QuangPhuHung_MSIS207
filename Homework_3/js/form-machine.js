// Form state machine: idle -> submitting -> success | error. Pure: it only decides
// which state comes next. It never touches the DOM, timers or the network.
// Public API: FormMachine.create(initial?) -> { state, requestId, dispatch(type, detail?) }
const FormMachine = (function () {
  'use strict';

  const STATES = Object.freeze(['idle', 'submitting', 'success', 'error']);
  const SETTLE = Object.freeze({ RESOLVE: 'success', REJECT: 'error', TIMEOUT: 'error' });

  function create(initial = 'idle') {
    if (!STATES.includes(initial)) {
      throw new TypeError(`FormMachine.create: unknown state "${initial}"`);
    }

    let state = initial;
    let requestId = 0;

    function enter(next) {
      state = next;
      if (next === 'submitting') requestId += 1; // every send gets a new id
    }

    // Events: SUBMIT { valid }, RETRY, EDIT, and RESOLVE / REJECT / TIMEOUT { requestId }.
    // Anything the current state does not accept is ignored. Returns the (new) state.
    function dispatch(type, detail = {}) {
      switch (state) {
        case 'idle':
          if (type === 'SUBMIT' && detail.valid === true) enter('submitting');
          break;
        case 'submitting':
          // A reply from an older request carries an old id and is dropped.
          if (type in SETTLE && detail.requestId === requestId) enter(SETTLE[type]);
          break;
        case 'error':
          if (type === 'RETRY' || (type === 'SUBMIT' && detail.valid === true)) enter('submitting');
          else if (type === 'EDIT') enter('idle');
          break;
        default: // success is final
          break;
      }
      return state;
    }

    return {
      get state() { return state; },
      get requestId() { return requestId; },
      dispatch,
    };
  }

  return { STATES, create };
})();
