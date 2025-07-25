
import {BaseDriver} from '../../../lib';
import {PROTOCOLS} from '../../../lib/constants';

class MockExecuteDriver extends BaseDriver {

  constructor() {
    super();
    this.protocol = PROTOCOLS.W3C;
    this.sessionId = null;
    this.jwpProxyActive = false;
  }

  async execute(script, args) {
    return {executed: script, args};
  }

  clarifyCommandName(cmd, args) {
    if (cmd === 'execute') {
      const firstArg = args?.[0];
      if (typeof firstArg === 'string' && firstArg.startsWith('mobile:')) {
        return firstArg.slice('mobile:'.length).trim();
      }
    }
    return cmd;
  }
}

export {MockExecuteDriver};
