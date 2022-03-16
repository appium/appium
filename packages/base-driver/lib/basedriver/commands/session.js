/* eslint-disable no-unused-vars */
/* eslint-disable require-await */
// @ts-check
import _ from 'lodash';

/**
 * @param {ReturnType<import('./settings').SettingsMixin>} Base
 * @returns {import('../driver').BaseDriverBase<import('@appium/types').TimeoutCommands & import('@appium/types').EventCommands & import('@appium/types').FindCommands & import('@appium/types').LogCommands & import('@appium/types').SettingsCommands & ISessionCommands>}
 */
export function SessionMixin (Base) {
  /**
   * @implements {ISessionCommands}
   */
  class SessionCommands extends Base {
    async getSessions () {
      let ret = [];

      if (this.sessionId) {
        ret.push({
          id: this.sessionId,
          capabilities: this.caps,
        });
      }

      return ret;
    }

    async getSession () {
      if (this.caps.eventTimings) {
        return Object.assign({}, this.caps, {events: this.eventHistory});
      }
      return this.caps;
    }
  }

  return SessionCommands;
}

/**
 * @typedef {import('@appium/types').SessionCommands} ISessionCommands
 */
