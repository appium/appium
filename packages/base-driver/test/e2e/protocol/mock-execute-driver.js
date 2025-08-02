
import {BaseDriver} from '../../../lib';
import {PROTOCOLS} from '../../../lib/constants';

class MockExecuteDriver extends BaseDriver {

  static executeMethodMap = {
    'mobile: activateApp': {
      command: 'mobileActivateApp',
    }
  };

  constructor() {
    super();
    this.protocol = PROTOCOLS.W3C;
    this.sessionId = null;
    this.jwpProxyActive = false;
  }

  async execute(script, args) {
    return {executed: script, args};
  }
}

export {MockExecuteDriver};
