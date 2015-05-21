import { MobileJsonWireProtocol } from 'mobile-json-wire-protocol';
import commands from './commands';
import _ from 'lodash';

class BaseDriver extends MobileJsonWireProtocol {

  constructor () {
    super();
    this.sessionId = null;
    this.caps = null;
  }

  sessionExists (sessionId) {
    if (!sessionId) return false;
    return sessionId === this.sessionId;
  }

  validateDesiredCaps (caps) {
    return !!caps;
  }

}

function wrapCommand (command) {
  return function (...args) {
    //TODO cancelTimer()
    return command(this, ...args);
    //TODO startTimer()
  };
}

for (let [name, func] of _.pairs(commands)) {
  BaseDriver.prototype[name] = wrapCommand(func);
}

export { BaseDriver };
