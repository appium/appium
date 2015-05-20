import { MobileJsonWireProtocol, errors } from 'mobile-json-wire-protocol';
import UUID from 'uuid-js';

class BaseDriver extends MobileJsonWireProtocol {

  constructor () {
    super();
    this.sessionId = null;
  }

  async createSession (caps) {
    if (this.sessionId !== null) {
      throw new errors.SessionNotCreatedError();
    }
    this.validateDesiredCaps(caps);
    this.sessionId = UUID.create().hex;
    return this.sessionId;
  }

  async deleteSession () {
    this.sessionId = null;
  }

  validateDesiredCaps (caps) {
    return !!caps;
  }
}

export { BaseDriver };
