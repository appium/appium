import {FakeDriver} from '../driver';
import {errors} from 'appium/driver';
import {mixin} from './mixin';

interface FakeDriverAlertMixin {
  assertNoAlert(): void;
  assertAlert(): void;

  getAlertText(): Promise<string>;

  setAlertText(text: string): Promise<void>;

  postAcceptAlert(): Promise<void>;
  postDismissAlert(): Promise<void>;
}

declare module '../driver' {
  interface FakeDriver extends FakeDriverAlertMixin {}
}

const AlertMixin: FakeDriverAlertMixin = {
  assertNoAlert(this: FakeDriver) {
    if (this.appModel.hasAlert()) {
      throw new errors.UnexpectedAlertOpenError();
    }
  },

  assertAlert(this: FakeDriver) {
    if (!this.appModel.hasAlert()) {
      throw new errors.NoAlertOpenError();
    }
  },

  /**
   * Get the text of an alert
   */
  async getAlertText(this: FakeDriver) {
    this.assertAlert();
    return this.appModel.alertText();
  },

  /**
   * Set the text of an alert
   */
  async setAlertText(this: FakeDriver, text: string) {
    this.assertAlert();
    try {
      this.appModel.setAlertText(text);
    } catch {
      throw new errors.InvalidElementStateError();
    }
  },

  /**
   * Accept an alert
   */
  async postAcceptAlert(this: FakeDriver) {
    this.assertAlert();
    this.appModel.handleAlert();
  },

  /**
   * Dismiss an alert
   */
  async postDismissAlert(this: FakeDriver) {
    return this.postAcceptAlert();
  },
};

mixin(AlertMixin);
