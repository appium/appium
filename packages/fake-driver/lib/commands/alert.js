import {errors} from 'appium/driver';

let commands = {},
  helpers = {},
  extensions = {};

helpers.assertNoAlert = function assertNoAlert() {
  if (this.appModel.hasAlert()) {
    throw new errors.UnexpectedAlertOpenError();
  }
};

helpers.assertAlert = function assertAlert() {
  if (!this.appModel.hasAlert()) {
    throw new errors.NoAlertOpenError();
  }
};

/**
 * Get the text of an alert
 *
 * @appiumCommand
 * @returns {Promise<string>}
 */
commands.getAlertText = async function getAlertText() {
  this.assertAlert();
  return this.appModel.alertText();
};

/**
 * Set the text of an alert
 *
 * @appiumCommand
 * @param {string} text
 * @returns {Promise<null>}
 */
commands.setAlertText = async function setAlertText(text) {
  this.assertAlert();
  try {
    this.appModel.setAlertText(text);
  } catch (e) {
    throw new errors.InvalidElementStateError();
  }
};

/**
 * Accept an alert
 *
 * @appiumCommand
 * @returns {Promise<null>}
 */
commands.postAcceptAlert = async function postAcceptAlert() {
  this.assertAlert();
  this.appModel.handleAlert();
};

/**
 * Dismiss an alert
 *
 * @appiumCommand
 * @returns {Promise<null>}
 */
commands.postDismissAlert = commands.postAcceptAlert;

Object.assign(extensions, commands, helpers);
export {commands, helpers};
export default extensions;
