import {Constraints, ISessionCommands, MultiSessionData, SingularSessionData} from '@appium/types';
import {BaseDriver} from '../driver';
import {mixin} from './mixin';

declare module '../driver' {
  interface BaseDriver<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    C extends Constraints
  > extends ISessionCommands {}
}

const SessionCommands: ISessionCommands = {
  async getSessions<C extends Constraints>(this: BaseDriver<C>) {
    const ret: MultiSessionData<C>[] = [];

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
    return <SingularSessionData<C>>(
      (this.caps.eventTimings ? {...this.caps, events: this.eventHistory} : this.caps)
    );
  },
};

mixin(SessionCommands);
