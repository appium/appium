import type {FakeDriver} from '../driver';
import {errors} from 'appium/driver';

export function assertNoAlert(this: FakeDriver): void {
  if (this.appModel.hasAlert()) {
    throw new errors.UnexpectedAlertOpenError();
  }
}

export function assertAlert(this: FakeDriver): void {
  if (!this.appModel.hasAlert()) {
    throw new errors.NoAlertOpenError();
  }
}

export async function getAlertText(this: FakeDriver): Promise<string> {
  assertAlert.call(this);
  return this.appModel.alertText();
}

export async function setAlertText(this: FakeDriver, text: string): Promise<void> {
  assertAlert.call(this);
  try {
    this.appModel.setAlertText(text);
  } catch {
    throw new errors.InvalidElementStateError();
  }
}

export async function postAcceptAlert(this: FakeDriver): Promise<void> {
  assertAlert.call(this);
  this.appModel.handleAlert();
}

export async function postDismissAlert(this: FakeDriver): Promise<void> {
  return postAcceptAlert.call(this);
}
