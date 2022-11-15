import type {DriverCaps, ExternalDriver, W3CDriverCaps} from '@appium/types';
import type {FakeDriverConstraints} from './driver';
import {FakeApp} from './fake-app';
import {FakeElement} from './fake-element';

/**
 * W3C-style caps for {@link FakeDriver}
 * @public
 */
export type W3CFakeDriverCaps = W3CDriverCaps<FakeDriverConstraints>;

/**
 * Capabilities for {@link FakeDriver}
 * @public
 */
export type FakeDriverCaps = DriverCaps<FakeDriverConstraints>;

export interface IFakeDriver extends ExternalDriver<FakeDriverConstraints> {
  elMap: Record<string, FakeElement>;
  maxElId: number;
  appModel: FakeApp;
  focusedElId: string;
  curContext: string;
}

export interface IGeneralCommands extends IFakeDriver {
  fakeAddition(num1: number, num2: number, num3?: number): Promise<number>;
}

export interface IContextsCommands extends IFakeDriver {
  assertWebviewContext(): void;
}

export interface IElementCommands extends IFakeDriver {
  getElement(id: string): FakeElement;
  getElements(ids: string[]): FakeElement[];
  setValue(text: string, id: string): Promise<void>;
}

export interface IAlertCommands extends IFakeDriver {
  assertNoAlert(): void;
}
