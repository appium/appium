import _ from 'lodash';
import {errors} from 'appium/driver';
import type {FakeDriver} from '../driver';
import type {Position, Rect, Size} from '@appium/types';
import type {FakeElement} from '../fake-element';

export function getElements(this: FakeDriver, elementIds: string[]): FakeElement[] {
  for (const elId of elementIds) {
    if (!_.has(this.elMap, elId)) {
      throw new errors.StaleElementReferenceError();
    }
  }
  return elementIds.map((e) => this.elMap[e]);
}

export function getElement(this: FakeDriver, elementId: string): FakeElement {
  return this.getElements([elementId])[0];
}

export async function getName(this: FakeDriver, elementId: string): Promise<string> {
  const el = this.getElement(elementId);
  return el.tagName;
}

export async function elementDisplayed(this: FakeDriver, elementId: string): Promise<boolean> {
  const el = this.getElement(elementId);
  return el.isVisible();
}

export async function elementEnabled(this: FakeDriver, elementId: string): Promise<boolean> {
  const el = this.getElement(elementId);
  return el.isEnabled();
}

export async function elementSelected(this: FakeDriver, elementId: string): Promise<boolean> {
  const el = this.getElement(elementId);
  return el.isSelected();
}

export async function setValue(
  this: FakeDriver,
  keys: string | string[],
  elementId: string
): Promise<void> {
  const value = _.isArray(keys) ? keys.join('') : keys;
  const el = this.getElement(elementId);
  if (el.type !== 'MockInputField') {
    throw new errors.InvalidElementStateError();
  }
  el.setAttr('value', value);
}

export async function getText(this: FakeDriver, elementId: string): Promise<string> {
  const el = this.getElement(elementId);
  return el.getAttr('value');
}

export async function clear(this: FakeDriver, elementId: string): Promise<void> {
  await this.setValue('', elementId);
}

export async function click(this: FakeDriver, elementId: string): Promise<void> {
  this.assertNoAlert();
  const el = this.getElement(elementId);
  if (!el.isVisible()) {
    throw new errors.InvalidElementStateError();
  }
  el.click();
  this.focusedElId = elementId;
}

export async function getAttribute(
  this: FakeDriver,
  elementId: string,
  attributeName: string
): Promise<string> {
  const el = this.getElement(elementId);
  return el.getAttr(attributeName);
}

export async function getElementRect(this: FakeDriver, elementId: string): Promise<Rect> {
  const el = this.getElement(elementId);
  return el.getElementRect();
}

export async function getSize(this: FakeDriver, elementId: string): Promise<Size> {
  const el = this.getElement(elementId);
  return el.getSize();
}

export async function equalsElement(
  this: FakeDriver,
  elementIdA: string,
  elementIdB: string
): Promise<boolean> {
  const el1 = this.getElement(elementIdA);
  const el2 = this.getElement(elementIdB);
  return el1.equals(el2);
}

export async function getCssProperty(
  this: FakeDriver,
  propertyName: string,
  elementId: string
): Promise<string> {
  const el = this.getElement(elementId);
  return el.getCss(propertyName) ?? '';
}

export async function getLocation(this: FakeDriver, elementId: string): Promise<Position> {
  const el = this.getElement(elementId);
  return el.getLocation();
}

export async function getLocationInView(
  this: FakeDriver,
  elementId: string
): Promise<Position> {
  return this.getLocation(elementId);
}
