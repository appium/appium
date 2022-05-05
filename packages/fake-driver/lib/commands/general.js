import _ from 'lodash';
import {errors} from 'appium/driver';

let commands = {},
  helpers = {},
  extensions = {};

commands.title = async function title() {
  this.assertWebviewContext();
  return this.appModel.title;
};

commands.keys = async function keys(value) {
  if (!this.focusedElId) {
    throw new errors.InvalidElementStateError();
  }
  await this.setValue(value, this.focusedElId);
};

commands.setGeoLocation = async function setGeoLocation(location) {
  // TODO test this adequately once WD bug is fixed
  this.appModel.lat = location.latitude;
  this.appModel.long = location.longitude;
};

commands.getGeoLocation = async function getGeoLocation() {
  return this.appModel.currentGeoLocation;
};

commands.getPageSource = async function getPageSource() {
  return this.appModel.rawXml;
};

commands.getOrientation = async function getOrientation() {
  return this.appModel.orientation;
};

commands.setOrientation = async function setOrientation(o) {
  if (!_.includes(['LANDSCAPE', 'PORTRAIT'], o)) {
    throw new errors.UnknownError('Orientation must be LANDSCAPE or PORTRAIT');
  }
  this.appModel.orientation = o;
};

commands.getScreenshot = async function getScreenshot() {
  return this.appModel.getScreenshot();
};

commands.getWindowSize = async function getWindowSize() {
  return {width: this.appModel.width, height: this.appModel.height};
};

commands.getWindowRect = async function getWindowRect() {
  return {width: this.appModel.width, height: this.appModel.height, x: 0, y: 0};
};

commands.performActions = async function performActions(actions) {
  this.appModel.actionLog.push(actions);
};

commands.releaseActions = async function releaseActions() {};

commands.getLog = async function getLog(type) {
  switch (type) {
    case 'actions':
      return this.appModel.actionLog;
    default:
      throw new Error(`Don't understand log type '${type}'`);
  }
};

Object.assign(extensions, commands, helpers);
export {commands, helpers};
export default extensions;
