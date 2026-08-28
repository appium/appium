import type {Constraints, InitialOpts} from '@appium/types';

import {BaseDriver} from '../../../lib/index.js';
import {PROTOCOLS} from '../../../lib/constants.js';

class MockExecuteDriver extends BaseDriver<Constraints> {
  static executeMethodMap = {
    'mobile: activateApp': {
      command: 'mobileActivateApp',
    },
  };

  declare wdProxyActive: boolean;

  constructor() {
    super({} as InitialOpts);
    this.protocol = PROTOCOLS.W3C;
    this.sessionId = null;
    this.wdProxyActive = false;
  }

  async execute(script: string, args: unknown[]): Promise<{executed: string; args: unknown[]}> {
    return {executed: script, args};
  }
}

export {MockExecuteDriver};
