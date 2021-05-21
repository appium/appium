import { errors } from 'appium-base-driver';

let commands = {}, helpers = {}, extensions = {};

helpers.assertNoAlert = function assertNoAlert () {
  if (this.appModel.hasAlert()) {
    throw new errors.UnexpectedAlertOpenError();
  }
};

helpers.assertAlert = function assertAlert () {
  if (!this.appModel.hasAlert()) {
    throw new errors.NoAlertOpenError();
  }
};

commands.getAlertText = async function getAlertText () {
  this.assertAlert();
  return this.appModel.alertText();
};

commands.setAlertText = async function setAlertText (text) {
  this.assertAlert();
  try {
    this.appModel.setAlertText(text);
  } catch (e) {
    throw new errors.InvalidElementStateError();
  }
};

commands.postAcceptAlert = async function postAcceptAlert () {
  this.assertAlert();
  this.appModel.handleAlert();
};

commands.postDismissAlert = commands.postAcceptAlert;

Object.assign(extensions, commands, helpers);
export { commands, helpers };
export default extensions;
