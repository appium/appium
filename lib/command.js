import log from 'appium-logger';
import { errors } from 'mobile-json-wire-protocol';
import UUID from 'uuid-js';

let commands = {

  createSession: async function (caps) {
    if (this.sessionId !== null) {
      throw new errors.SessionNotCreatedError();
    }
    this.validateDesiredCaps(caps);
    this.sessionId = UUID.create().hex;
    this.caps = caps;

    log.info(`Session created with session id: ${this.sessionId}`);

    return [this.sessionId, caps];
  },

  getSessions: function () {
    let ret = [];

    if (this.sessionId) {
      ret.push({
        id: this.sessionId,
        capabilities: this.caps
      });
    }

    return ret;
  },

  getSession: function () {
    return this.caps;

  },

  deleteSession: function () {
    this.sessionId = null;
  }
};


export { commands };
