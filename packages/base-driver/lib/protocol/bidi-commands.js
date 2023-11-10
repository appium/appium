const SUBSCRIPTION_REQUEST_PARAMS = /** @type {const} */ ({
  required: ['events'],
  optional: ['contexts'],
});

const BIDI_COMMANDS = /** @type {const} */ ({
  session: {
    subscribe: {
      command: 'bidiSubscribe',
      params: SUBSCRIPTION_REQUEST_PARAMS,
    },
    unsubscribe: {
      command: 'bidiUnsubscribe',
      params: SUBSCRIPTION_REQUEST_PARAMS,
    },
  },
  browsingContext: {
    navigate: {
      command: 'bidiNavigate',
      params: {
        required: ['context', 'url'],
        optional: ['wait'],
      },
    },
  },
});

// TODO add definitions for all bidi commands.
// spec link: https://w3c.github.io/webdriver-bidi/

export {BIDI_COMMANDS};
