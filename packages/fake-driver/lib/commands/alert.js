import {errors} from 'appium/driver';

export default {
  /**
   * @this {FakeDriver}
   */
  assertNoAlert() {
    if (this.appModel.hasAlert()) {
      throw new errors.UnexpectedAlertOpenError();
    }
  },

  /**
   * @this {FakeDriver}
   */
  assertAlert() {
    if (!this.appModel.hasAlert()) {
      throw new errors.NoAlertOpenError();
    }
  },

  /**
   * Get the text of an alert
   *
   * @returns {Promise<string>}
   * @this {FakeDriver}
   */
  async getAlertText() {
    this.assertAlert();
    return this.appModel.alertText();
  },

  /**
   * Set the text of an alert
   *
   * @param {string} text
   * @returns {Promise<void>}
   * @this {FakeDriver}
   */
  async setAlertText(text) {
    this.assertAlert();
    try {
      this.appModel.setAlertText(text);
    } catch (e) {
      throw new errors.InvalidElementStateError();
    }
  },

  /**
   * Accept an alert
   *
   * @returns {Promise<void>}
   * @this {FakeDriver}
   */
  async postAcceptAlert() {
    this.assertAlert();
    this.appModel.handleAlert();
  },

  /**
   * Dismiss an alert
   *
   * @returns {Promise<void>}
   * @this {FakeDriver}
   */
  async postDismissAlert() {
    return this.postAcceptAlert();
  },
};

/**
 * @typedef {import('../driver').FakeDriver} FakeDriver
 */
