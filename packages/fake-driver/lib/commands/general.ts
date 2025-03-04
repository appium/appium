import {ActionSequence, Location, Rect, Size} from '@appium/types';
import {errors} from 'appium/driver';
import {FakeDriver} from '../driver';
import {mixin} from './mixin';
import type {Orientation} from '../driver';

const ORIENTATIONS = new Set(['LANDSCAPE', 'PORTRAIT']);

interface FakeDriverGeneralMixin {
  title(): Promise<string>;
  keys(value: string | string[]): Promise<void>;
  setGeoLocation(location: Location): Promise<Location>;
  getGeoLocation(): Promise<Location>;
  getPageSource(): Promise<string>;
  getOrientation(): Promise<string>;
  setOrientation(orientation: Orientation): Promise<void>;
  getScreenshot(): Promise<string>;
  getWindowSize(): Promise<Size>;
  getWindowRect(): Promise<Rect>;
  performActions(actions: ActionSequence[]): Promise<void>;
  releaseActions(): Promise<void>;
  mobileShake(): Promise<void>;
  doubleClick(): Promise<void>;
  execute(script: string, args: any[]): Promise<any>;
  fakeAddition(a: number, b: number, c?: number): Promise<number>;
  getLog(type: string): Promise<any>;
  getUrl(): Promise<string>;

  bidiNavigate(context: string, url: string): Promise<void>;
}

declare module '../driver' {
  interface FakeDriver extends FakeDriverGeneralMixin {}
}

const GeneralMixin: FakeDriverGeneralMixin = {
  async title(this: FakeDriver) {
    this.assertWebviewContext();
    return this.appModel.title;
  },

  async keys(this: FakeDriver, value: string | string[]) {
    if (!this.focusedElId) {
      throw new errors.InvalidElementStateError();
    }
    await this.setValue(value, this.focusedElId);
  },

  async setGeoLocation(this: FakeDriver, location: Location) {
    // TODO test this adequately once WD bug is fixed
    this.appModel.lat = location.latitude;
    this.appModel.long = location.longitude;
    return location;
  },

  async getGeoLocation(this: FakeDriver) {
    return this.appModel.currentGeoLocation;
  },

  async getPageSource(this: FakeDriver) {
    return this.appModel.rawXml;
  },

  async getOrientation(this: FakeDriver) {
    return this.appModel.orientation;
  },

  async setOrientation(this: FakeDriver, o: Orientation) {
    if (!ORIENTATIONS.has(o)) {
      throw new errors.UnknownError('Orientation must be LANDSCAPE or PORTRAIT');
    }
    this.appModel.orientation = o;
  },

  async getScreenshot(this: FakeDriver) {
    return this.appModel.getScreenshot();
  },

  async getWindowSize(this: FakeDriver) {
    return {width: this.appModel.width, height: this.appModel.height};
  },

  async getWindowRect(this: FakeDriver) {
    return {width: this.appModel.width, height: this.appModel.height, x: 0, y: 0};
  },

  async performActions(this: FakeDriver, actions: ActionSequence[]) {
    this.appModel.actionLog.push(actions);
  },

  async releaseActions(this: FakeDriver) {},

  async getLog(this: FakeDriver, type: string): Promise<ActionSequence[][]> {
    switch (type) {
      case 'actions':
        return this.appModel.actionLog;
      default:
        throw new Error(`Don't understand log type '${type}'`);
    }
  },

  async mobileShake(this: FakeDriver) {
    this.shook = true;
  },

  async doubleClick(this: FakeDriver) {},

  async execute(this: FakeDriver, script: string, args: any[]) {
    return await this.executeMethod(script, args);
  },

  /**
   * Add two or maybe even three numbers
   */
  async fakeAddition(this: FakeDriver, num1: number, num2: number, num3 = 0) {
    return num1 + num2 + (num3 ?? 0);
  },

  async getUrl() {
    return this.url;
  },

  async bidiNavigate(context: string, url: string) {
    this.url = url;
  },
};

mixin(GeneralMixin);
