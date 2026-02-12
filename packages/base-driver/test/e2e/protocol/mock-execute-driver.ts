import type {Constraints, InitialOpts} from '@appium/types';
import {BaseDriver} from '../../../lib';
import {PROTOCOLS} from '../../../lib/constants';

class MockExecuteDriver extends BaseDriver<Constraints> {
  static executeMethodMap = {
    'mobile: activateApp': {
      command: 'mobileActivateApp',
    },
  };

  declare jwpProxyActive: boolean;

  constructor() {
    super({} as InitialOpts);
    this.protocol = PROTOCOLS.W3C;
    this.sessionId = null;
    this.jwpProxyActive = false;
  }

  async execute(script: string, args: unknown[]): Promise<{executed: string; args: unknown[]}> {
    return {executed: script, args};
  }
}

export {MockExecuteDriver};
