import {Constraints, ISessionCommands, MultiSessionData} from '@appium/types';
import {BaseDriver} from '../driver';
import {mixin} from './mixin';

declare module '../driver' {
  interface BaseDriver<C extends Constraints> extends ISessionCommands {}
}

const SessionCommands: ISessionCommands = {
  async getSessions<C extends Constraints>(this: BaseDriver<C>) {
    const ret: MultiSessionData[] = [];

    if (this.sessionId) {
      ret.push({
        id: this.sessionId,
        capabilities: this.caps,
      });
    }

    return ret;
  },

  /**
   * Returns capabilities for the session and event history (if applicable)
   */
  async getSession<C extends Constraints>(this: BaseDriver<C>) {
    if (this.caps.eventTimings) {
      return {...this.caps, events: this.eventHistory};
    }
    return this.caps;
  },
};

mixin(SessionCommands);
