import {errors} from 'appium/driver';

const ORIENTATIONS = new Set(['LANDSCAPE', 'PORTRAIT']);

/**
 * @template {Class<import('../types').IContextsCommands & import('../types').IElementCommands>} T
 * @param {T} Base
 */
export function GeneralMixin(Base) {
  /**
   * @implements {IGeneralCommands}
   */
  class GeneralCommands extends Base {
    async title() {
      this.assertWebviewContext();
      return this.appModel.title;
    }

    async keys(value) {
      if (!this.focusedElId) {
        throw new errors.InvalidElementStateError();
      }
      await this.setValue(value, this.focusedElId);
    }

    async setGeoLocation(location) {
      // TODO test this adequately once WD bug is fixed
      this.appModel.lat = location.latitude;
      this.appModel.long = location.longitude;
    }

    async getGeoLocation() {
      return this.appModel.currentGeoLocation;
    }

    async getPageSource() {
      return this.appModel.rawXml;
    }

    async getOrientation() {
      return this.appModel.orientation;
    }

    /**
     *
     * @param {import('../types').FakeDriverCaps['orientation']} o
     */
    async setOrientation(o) {
      if (!ORIENTATIONS.has(o)) {
        throw new errors.UnknownError('Orientation must be LANDSCAPE or PORTRAIT');
      }
      this.appModel.orientation = o;
    }

    async getScreenshot() {
      return this.appModel.getScreenshot();
    }

    async getWindowSize() {
      return {width: this.appModel.width, height: this.appModel.height};
    }

    async getWindowRect() {
      return {width: this.appModel.width, height: this.appModel.height, x: 0, y: 0};
    }

    async performActions(actions) {
      this.appModel.actionLog.push(actions);
    }

    async releaseActions() {}

    async getLog(type) {
      switch (type) {
        case 'actions':
          return this.appModel.actionLog;
        default:
          throw new Error(`Don't understand log type '${type}'`);
      }
    }

    async execute(script, args) {
      return await this.executeMethod(script, args);
    }

    /**
     * Add two or maybe even three numbers
     *
     * @param {number} num1
     * @param {number} num2
     * @param {number} [num3]
     * @returns {Promise<number>}
     */
    async fakeAddition(num1, num2, num3 = 0) {
      return num1 + num2 + (num3 ?? 0);
    }
  }

  return GeneralCommands;
}

/**
 * @typedef {import('../driver').FakeDriverCore} FakeDriverCore
 */

/**
 * @template T,[U={}],[V=Array<any>]
 * @typedef {import('@appium/types').Class<T,U,V>} Class
 */

/**
 * @typedef {import('../types').IGeneralCommands} IGeneralCommands
 */
