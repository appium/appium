import { Action } from 'argparse';


const DEFAULT_CAPS_ARG = '--default-capabilities';


class StoreDeprecatedAction extends Action {
  constructor (options = {}) {
    const opts = Object.assign({}, options);
    let helpPrefix = '[DEPRECATED]';
    if (opts.deprecated_for) {
      helpPrefix = `[DEPRECATED, use ${opts.deprecated_for} instead]`;
      delete opts.deprecated_for;
    }
    if (opts.help) {
      opts.help = `${helpPrefix} - ${opts.help}`;
    } else {
      opts.help = helpPrefix;
    }
    super(opts);
  }

  call (parser, namespace, values) {
    namespace[this.dest] = values;
  }
}


class StoreDeprecatedTrueAction extends StoreDeprecatedAction {
  constructor (options = {}) {
    super(Object.assign({}, options, {const: true, nargs: 0}));
  }

  call (parser, namespace) {
    namespace[this.dest] = this.const;
  }
}


class StoreDeprecatedDefaultCapabilityAction extends StoreDeprecatedAction {
  constructor (options = {}) {
    super(Object.assign({}, options, {deprecated_for: DEFAULT_CAPS_ARG}));
  }

  _writeDefaultCap (namespace, value) {
    namespace[this.dest] = value;
    if (value === this.default) {
      return;
    }

    if (!namespace.defaultCapabilities) {
      namespace.defaultCapabilities = {};
    }
    namespace.defaultCapabilities[this.dest] = value;
  }

  call (parser, namespace, values) {
    this._writeDefaultCap(namespace, values);
  }
}


class StoreDeprecatedDefaultCapabilityTrueAction extends StoreDeprecatedDefaultCapabilityAction {
  constructor (options = {}) {
    super(Object.assign({}, options, {const: true, nargs: 0}));
  }

  call (parser, namespace) {
    this._writeDefaultCap(namespace, this.const);
  }
}

export {
  StoreDeprecatedAction, StoreDeprecatedTrueAction,
  StoreDeprecatedDefaultCapabilityAction, StoreDeprecatedDefaultCapabilityTrueAction,
  DEFAULT_CAPS_ARG,
};
