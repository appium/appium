/* eslint-disable no-unused-vars */
/* eslint-disable require-await */
// @ts-check
import _ from 'lodash';

/**
 * @param {SettingsBase} Base
 * @returns {SessionBase}
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
 * @typedef {import('@appium/types').SessionCommands} ISessionCommands
 * @typedef {import('@appium/types').SingularSessionData} SingularSessionData
 * @typedef {import('@appium/types').MultiSessionData} MultiSessionData
 * @typedef {import('./settings').SettingsBase} SettingsBase
 * @typedef {import('../driver').BaseDriverBase<import('@appium/types').TimeoutCommands & import('@appium/types').EventCommands & import('@appium/types').FindCommands & import('@appium/types').LogCommands & import('@appium/types').SettingsCommands & ISessionCommands>} SessionBase
 */
