import {errors} from 'appium/driver';

/**
 * @template {Class<import('../types').IContextsCommands & import('@appium/types').IFindCommands>} T
 * @param {T} Base
 * @returns {Class<AlertCommands>}
 */
export function AlertMixin(Base) {
  /**
   * @implements {IAlertCommands}
   */
  class AlertCommands extends Base {
    assertNoAlert() {
      if (this.appModel.hasAlert()) {
        throw new errors.UnexpectedAlertOpenError();
      }
    }

    assertAlert() {
      if (!this.appModel.hasAlert()) {
        throw new errors.NoAlertOpenError();
      }
    }

    /**
     * Get the text of an alert
     *
     * @returns {Promise<string>}
     */
    async getAlertText() {
      this.assertAlert();
      return this.appModel.alertText();
    }

    /**
     * Set the text of an alert
     *
     * @param {string} text
     * @returns {Promise<void>}
     */
    async setAlertText(text) {
      this.assertAlert();
      try {
        this.appModel.setAlertText(text);
      } catch (e) {
        throw new errors.InvalidElementStateError();
      }
    }

    /**
     * Accept an alert
     *
     * @returns {Promise<void>}
     */
    async postAcceptAlert() {
      this.assertAlert();
      this.appModel.handleAlert();
    }

    /**
     * Dismiss an alert
     *
     * @returns {Promise<null>}
     */
    postDismissAlert = this.postAcceptAlert;
  }

  return AlertCommands;
}

/**
 * @typedef {import('../driver').FakeDriverCore} FakeDriverCore
 */

/**
 * @template T,[U={}],[V=Array<any>]
 * @typedef {import('@appium/types').Class<T,U,V>} Class
 */

/**
 * @typedef {import('../types').IAlertCommands} IAlertCommands
 */
