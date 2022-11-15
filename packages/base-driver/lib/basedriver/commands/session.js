/* eslint-disable no-unused-vars */
/* eslint-disable require-await */
// @ts-check
import _ from 'lodash';

/**
 * @template {Constraints} C
 * @param {import('./settings').SettingsBase<C>} Base
 * @returns {SessionBase<C>}
 */
export function SessionMixin(Base) {
  /**
   * @implements {ISessionCommands}
   */
  class SessionCommands extends Base {
    /**
     * @returns {Promise<MultiSessionData[]>}
     */
    async getSessions() {
      let ret = [];

      if (this.sessionId) {
        ret.push({
          id: this.sessionId,
          capabilities: this.caps,
        });
      }

      return ret;
    }

    /**
     * @returns {Promise<SingularSessionData>}
     */
    async getSession() {
      if (this.caps.eventTimings) {
        return {...this.caps, events: this.eventHistory};
      }
      return this.caps;
    }
  }

  return SessionCommands;
}

/**
 * @typedef {import('@appium/types').ISessionCommands} ISessionCommands
 * @typedef {import('@appium/types').SingularSessionData} SingularSessionData
 * @typedef {import('@appium/types').MultiSessionData} MultiSessionData
 * @typedef {import('@appium/types').Constraints} Constraints
 */

/**
 * @template {Constraints} C
 * @typedef {import('../driver').BaseDriverBase<C, import('@appium/types').ITimeoutCommands & import('@appium/types').IEventCommands & import('@appium/types').IFindCommands & import('@appium/types').ILogCommands<C> & import('@appium/types').ISettingsCommands & ISessionCommands>} SessionBase
 */
