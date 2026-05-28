import type {ActionSequence, Location, Rect, Size, Orientation} from '@appium/types';
import {errors} from 'appium/driver';
import type {FakeDriver} from '../driver';

const ORIENTATIONS = new Set<string>(['LANDSCAPE', 'PORTRAIT']);

/** Requires webview context (title comes from active document). */
export async function title(this: FakeDriver): Promise<string> {
  this.assertWebviewContext();
  return this.appModel.title;
}

/** keys. */
export async function keys(
  this: FakeDriver,
  value: string | string[]
): Promise<void> {
  if (!this.focusedElId) {
    throw new errors.InvalidElementStateError();
  }
  await this.setValue(value, this.focusedElId);
}

/** setGeoLocation. */
export async function setGeoLocation(
  this: FakeDriver,
  location: Location
): Promise<Location> {
  this.appModel.lat = location.latitude;
  this.appModel.long = location.longitude;
  return location;
}

/** getGeoLocation. */
export async function getGeoLocation(this: FakeDriver): Promise<Location> {
  return this.appModel.currentGeoLocation;
}

/** getPageSource. */
export async function getPageSource(this: FakeDriver): Promise<string> {
  return this.appModel.rawXml;
}

/** getOrientation. */
export async function getOrientation(this: FakeDriver): Promise<string> {
  return this.appModel.orientation;
}

/** setOrientation. */
export async function setOrientation(
  this: FakeDriver,
  o: Orientation
): Promise<void> {
  if (!ORIENTATIONS.has(o)) {
    throw new errors.UnknownError('Orientation must be LANDSCAPE or PORTRAIT');
  }
  this.appModel.orientation = o;
}

/** getScreenshot. */
export async function getScreenshot(this: FakeDriver): Promise<string> {
  return this.appModel.getScreenshot();
}

/** getWindowSize. */
export async function getWindowSize(this: FakeDriver): Promise<Size> {
  return {width: this.appModel.width, height: this.appModel.height};
}

/** getWindowRect. */
export async function getWindowRect(this: FakeDriver): Promise<Rect> {
  return {width: this.appModel.width, height: this.appModel.height, x: 0, y: 0};
}

/** performActions. */
export async function performActions(
  this: FakeDriver,
  actions: ActionSequence[]
): Promise<void> {
  this.appModel.actionLog.push(actions);
}

/** releaseActions. */
export async function releaseActions(this: FakeDriver): Promise<void> {}

/** Supported log types: 'actions'. TODO: add more log types if needed for tests. */
export async function getLog(
  this: FakeDriver,
  type: string
): Promise<ActionSequence[][]> {
  switch (type) {
    case 'actions':
      return this.appModel.actionLog;
    default:
      throw new Error(`Don't understand log type '${type}'`);
  }
}

/** mobileShake. */
export async function mobileShake(this: FakeDriver): Promise<void> {
  this.shook = true;
}

/** doubleClick. */
export async function doubleClick(this: FakeDriver): Promise<void> {}

/** execute. */
export async function execute(
  this: FakeDriver,
  script: string,
  args: any[]
): Promise<any> {
  return await this.executeMethod(script, args);
}

/** fakeAddition. */
export async function fakeAddition(
  this: FakeDriver,
  num1: number,
  num2: number,
  num3 = 0
): Promise<number> {
  return num1 + num2 + (num3 ?? 0);
}

/** Get current URL. Returns empty string until bidiNavigate (or equivalent) sets one. @see https://w3c.github.io/webdriver/#get-current-url */
export async function getUrl(this: FakeDriver): Promise<string> {
  return this.url ?? '';
}

/** Set current URL (used by Bidi browsingContext.navigate). */
export async function bidiNavigate(
  this: FakeDriver,
  context: string,
  url: string
): Promise<void> {
  this.url = url;
}

/** Return the last math result detected by a plugin that publishes it */
export async function getLastPluginMath(this: FakeDriver): Promise<{pluginName: string, result: number} | null> {
  return this.lastPluginMath;
}
