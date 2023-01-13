import {errors} from 'appium/driver';

const ORIENTATIONS = new Set(['LANDSCAPE', 'PORTRAIT']);

export default {
  /**
   * @this {FakeDriver}
   */
  async title() {
    this.assertWebviewContext();
    return this.appModel.title;
  },

  /**
   * @this {FakeDriver}
   */
  async keys(value) {
    if (!this.focusedElId) {
      throw new errors.InvalidElementStateError();
    }
    await this.setValue(value, this.focusedElId);
  },

  /**
   * @this {FakeDriver}
   */
  async setGeoLocation(location) {
    // TODO test this adequately once WD bug is fixed
    this.appModel.lat = location.latitude;
    this.appModel.long = location.longitude;
  },

  /**
   * @this {FakeDriver}
   */
  async getGeoLocation() {
    return this.appModel.currentGeoLocation;
  },

  /**
   * @this {FakeDriver}
   */
  async getPageSource() {
    return this.appModel.rawXml;
  },

  /**
   * @this {FakeDriver}
   */
  async getOrientation() {
    return this.appModel.orientation;
  },

  /**
   *
   * @param {import('../types').FakeDriverCaps['orientation']} o
   * @this {FakeDriver}
   */
  async setOrientation(o) {
    if (!ORIENTATIONS.has(o)) {
      throw new errors.UnknownError('Orientation must be LANDSCAPE or PORTRAIT');
    }
    this.appModel.orientation = o;
  },

  /**
   * @this {FakeDriver}
   */
  async getScreenshot() {
    return this.appModel.getScreenshot();
  },

  /**
   * @this {FakeDriver}
   */
  async getWindowSize() {
    return {width: this.appModel.width, height: this.appModel.height};
  },

  /**
   * @this {FakeDriver}
   */
  async getWindowRect() {
    return {width: this.appModel.width, height: this.appModel.height, x: 0, y: 0};
  },

  /**
   *
   * @this {FakeDriver}
   */
  async performActions(actions) {
    this.appModel.actionLog.push(actions);
  },

  /**
   * @this {FakeDriver}
   */
  async releaseActions() {},

  /**
   * @this {FakeDriver}
   */
  async getLog(type) {
    switch (type) {
      case 'actions':
        return this.appModel.actionLog;
      default:
        throw new Error(`Don't understand log type '${type}'`);
    }
  },

  /**
   * @this {FakeDriver}
   */
  async mobileShake() {
    this.shook = true;
  },

  /**
   * @this {FakeDriver}
   */
  async doubleClick() {},

  /**
   * @this {FakeDriver}
   */
  async execute(script, args) {
    return await this.executeMethod(script, args);
  },

  /**
   * Add two or maybe even three numbers
   *
   * @param {number} num1
   * @param {number} num2
   * @param {number} [num3]
   * @returns {Promise<number>}
   * @this {FakeDriver}
   */
  async fakeAddition(num1, num2, num3 = 0) {
    return num1 + num2 + (num3 ?? 0);
  },
};

/**
 * @typedef {import('../driver').FakeDriver} FakeDriver
 */
