import type {FakeDriver} from '../driver';
import {errors} from 'appium/driver';

/** Throw if an alert is currently open (blocks other commands). */
export function assertNoAlert(this: FakeDriver): void {
  if (this.appModel.hasAlert()) {
    throw new errors.UnexpectedAlertOpenError();
  }
}

/** Throw if no alert is open (required before get/set alert text, accept, etc.). */
export function assertAlert(this: FakeDriver): void {
  if (!this.appModel.hasAlert()) {
    throw new errors.NoAlertOpenError();
  }
}

export async function getAlertText(this: FakeDriver): Promise<string> {
  this.assertAlert();
  return this.appModel.alertText();
}

export async function setAlertText(this: FakeDriver, text: string): Promise<void> {
  this.assertAlert();
  try {
    this.appModel.setAlertText(text);
  } catch {
    throw new errors.InvalidElementStateError();
  }
}

export async function postAcceptAlert(this: FakeDriver): Promise<void> {
  this.assertAlert();
  this.appModel.handleAlert();
}

/** In this fake, dismiss is the same as accept. */
export async function postDismissAlert(this: FakeDriver): Promise<void> {
  return this.postAcceptAlert();
}
