import type {Constraints} from '@appium/types';
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
    super({} as any);
    this.protocol = PROTOCOLS.W3C;
    this.sessionId = null;
    this.jwpProxyActive = false;
  }

  async execute(script: string, args: any[]): Promise<{executed: string; args: any[]}> {
    return {executed: script, args};
  }
}

export {MockExecuteDriver};
