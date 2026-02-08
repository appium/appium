import {ActionSequence, Location, Rect, Size} from '@appium/types';
import {errors} from 'appium/driver';
import type {FakeDriver} from '../driver';
import type {Orientation} from '@appium/types';

const ORIENTATIONS = new Set<string>(['LANDSCAPE', 'PORTRAIT']);

export async function title(this: FakeDriver): Promise<string> {
  this.assertWebviewContext();
  return this.appModel.title;
}

export async function keys(
  this: FakeDriver,
  value: string | string[]
): Promise<void> {
  if (!this.focusedElId) {
    throw new errors.InvalidElementStateError();
  }
  await this.setValue(value, this.focusedElId);
}

export async function setGeoLocation(
  this: FakeDriver,
  location: Location
): Promise<Location> {
  this.appModel.lat = location.latitude;
  this.appModel.long = location.longitude;
  return location;
}

export async function getGeoLocation(this: FakeDriver): Promise<Location> {
  return this.appModel.currentGeoLocation;
}

export async function getPageSource(this: FakeDriver): Promise<string> {
  return this.appModel.rawXml;
}

export async function getOrientation(this: FakeDriver): Promise<string> {
  return this.appModel.orientation;
}

export async function setOrientation(
  this: FakeDriver,
  o: Orientation
): Promise<void> {
  if (!ORIENTATIONS.has(o)) {
    throw new errors.UnknownError('Orientation must be LANDSCAPE or PORTRAIT');
  }
  this.appModel.orientation = o;
}

export async function getScreenshot(this: FakeDriver): Promise<string> {
  return this.appModel.getScreenshot();
}

export async function getWindowSize(this: FakeDriver): Promise<Size> {
  return {width: this.appModel.width, height: this.appModel.height};
}

export async function getWindowRect(this: FakeDriver): Promise<Rect> {
  return {width: this.appModel.width, height: this.appModel.height, x: 0, y: 0};
}

export async function performActions(
  this: FakeDriver,
  actions: ActionSequence[]
): Promise<void> {
  this.appModel.actionLog.push(actions);
}

export async function releaseActions(this: FakeDriver): Promise<void> {}

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

export async function mobileShake(this: FakeDriver): Promise<void> {
  this.shook = true;
}

export async function doubleClick(this: FakeDriver): Promise<void> {}

export async function execute(
  this: FakeDriver,
  script: string,
  args: any[]
): Promise<any> {
  return await this.executeMethod(script, args);
}

export async function fakeAddition(
  this: FakeDriver,
  num1: number,
  num2: number,
  num3 = 0
): Promise<number> {
  return num1 + num2 + (num3 ?? 0);
}

export async function getUrl(this: FakeDriver): Promise<string> {
  return this.url ?? '';
}

export async function bidiNavigate(
  this: FakeDriver,
  context: string,
  url: string
): Promise<void> {
  this.url = url;
}
