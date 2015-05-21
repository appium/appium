import log from 'appium-logger';
import { errors } from 'mobile-json-wire-protocol';
import UUID from 'uuid-js';

let commands = {};

commands.createSession = async function (caps) {
  if (this.sessionId !== null) {
    throw new errors.SessionNotCreatedError();
  }
  this.validateDesiredCaps(caps);
  this.sessionId = UUID.create().hex;
  this.caps = caps;

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
  this.sessionId = null;
};

export default commands;
