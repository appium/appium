import _ from 'lodash';
import log from '../logger';
import { errors } from 'mobile-json-wire-protocol';
import UUID from 'uuid-js';

let commands = {};

commands.createSession = async function (caps) {
  if (this.sessionId !== null) {
    throw new errors.SessionNotCreatedError("Cannot create a new session " +
                                            "while one is in progress");
  }
  this.validateDesiredCaps(caps);
  this.sessionId = UUID.create().hex;
  this.caps = caps;
  this.opts = _.cloneDeep(this.initialOpts);

  // merge caps onto opts so we don't need to worry about what's where
  Object.assign(this.opts, this.caps);


  // Prevents empty string caps so we don't need to test it everywhere
  if (typeof this.opts.app === 'string' && this.opts.app.trim() === '') {
    this.opts.app = null;
  }

  if (!_.isUndefined(this.caps.newCommandTimeout)) {
    this.newCommandTimeoutMs = (this.caps.newCommandTimeout * 1000);
  }

  // We need to ininitialize one onUnexpectedShutdow promise per session
  // to avoid the promise fulfilment being propagated between sessions.
  this.resetOnUnexpectedShutdown();

  log.info(`Session created with session id: ${this.sessionId}`);

  return [this.sessionId, caps];
};

commands.getSessions = async function () {
  let ret = [];

  if (this.sessionId) {
    ret.push({
      id: this.sessionId,
      capabilities: this.caps
    });
  }

  return ret;
};

commands.getSession = async function () {
  return this.caps;
};

commands.deleteSession = async function () {
  this.clearNewCommandTimeout();
  this.sessionId = null;
};

export default commands;
