import _ from 'lodash';
import log from '../logger';
import { errors } from 'mobile-json-wire-protocol';
import UUID from 'uuid-js';

const NEW_COMMAND_TIMEOUT_MS = 60 * 1000;

let commands = {};

commands.createSession = async function (caps) {
  if (this.sessionId !== null) {
    throw new errors.SessionNotCreatedError("Cannot create a new session " +
                                            "while one is in progress");
  }
  this.validateDesiredCaps(caps);
  this.sessionId = UUID.create().hex;
  this.caps = caps;

  // TODO move into capabilities object/parser/class thing
  if (_.isUndefined(this.caps.newCommandTimeout)) {
    this.newCommandTimeoutMs = NEW_COMMAND_TIMEOUT_MS;
  } else {
    this.newCommandTimeoutMs = (this.caps.newCommandTimeout * 1000) || null;
  }

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
  if (this.noCommandTimer) {
    clearTimeout(this.noCommandTimer);
  }
  this.noCommandTimer = null;
  this.sessionId = null;
};

export default commands;
