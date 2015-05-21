import log from 'appium-logger';
import { errors } from 'mobile-json-wire-protocol';
import UUID from 'uuid-js';

let commands = {

  createSession: async (driver, caps) => {
    if (driver.sessionId !== null) {
      throw new errors.SessionNotCreatedError();
    }
    driver.validateDesiredCaps(caps);
    driver.sessionId = UUID.create().hex;
    driver.caps = caps;

    log.info(`Session created with session id: ${driver.sessionId}`);

    return [driver.sessionId, caps];
  },

  getSessions: (driver) => {
    let ret = [];

    if (driver.sessionId) {
      ret.push({
        id: driver.sessionId,
        capabilities: driver.caps
      });
    }

    return ret;
  },

  getSession: (driver) => {
    return driver.caps;

  },

  deleteSession: (driver) => {
    driver.sessionId = null;
  }
};


export { commands };
