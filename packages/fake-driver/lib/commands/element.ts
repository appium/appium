import _ from 'lodash';
import {errors} from 'appium/driver';
import {FakeDriver} from '../driver';
import {Position, Rect, Size} from '@appium/types';
import {FakeElement} from '../fake-element';
import {mixin} from './mixin';

interface FakeDriverElementsMixin {
  getElements(elementIds: string[]): FakeElement[];
  getElement(elementId: string): FakeElement;
  getName(elementId: string): Promise<string>;
  elementDisplayed(elementId: string): Promise<boolean>;
  elementEnabled(elementId: string): Promise<boolean>;
  elementSelected(elementId: string): Promise<boolean>;
  setValue(keys: string | string[], value: string): Promise<void>;
  getText(elementId: string): Promise<string>;
  clear(elementId: string): Promise<void>;
  click(elementId: string): Promise<void>;

  getAttribute(elementId: string, attributeName: string): Promise<string>;
  getElementRect(elementId: string): Promise<Rect>;
  getSize(elementId: string): Promise<Size>;
  equalsElement(elementId: string, otherElementId: string): Promise<boolean>;
  getCssProperty(elementId: string, propertyName: string): Promise<string>;
  getLocation(elementId: string): Promise<Position>;
  getLocationInView(elementId: string): Promise<Position>;
}

declare module '../driver' {
  interface FakeDriver extends FakeDriverElementsMixin {}
}

const ElementsMixin: FakeDriverElementsMixin = {
  getElements(this: FakeDriver, elementIds: string[]) {
    for (const elId of elementIds) {
      if (!_.has(this.elMap, elId)) {
        throw new errors.StaleElementReferenceError();
      }
    }
    return elementIds.map((e) => this.elMap[e]);
  },

  getElement(this: FakeDriver, elementId: string) {
    return this.getElements([elementId])[0];
  },

  async getName(this: FakeDriver, elementId: string) {
    const el = this.getElement(elementId);
    return el.tagName;
  },

  async elementDisplayed(this: FakeDriver, elementId: string) {
    const el = this.getElement(elementId);
    return el.isVisible();
  },

  async elementEnabled(this: FakeDriver, elementId: string) {
    const el = this.getElement(elementId);
    return el.isEnabled();
  },

  async elementSelected(this: FakeDriver, elementId: string) {
    const el = this.getElement(elementId);
    return el.isSelected();
  },

  async setValue(this: FakeDriver, keys: string | string[], elementId: string) {
    const value = _.isArray(keys) ? keys.join('') : keys;
    const el = this.getElement(elementId);
    if (el.type !== 'MockInputField') {
      throw new errors.InvalidElementStateError();
    }
    el.setAttr('value', value);
  },

  async getText(this: FakeDriver, elementId: string) {
    const el = this.getElement(elementId);
    return el.getAttr('value');
  },

  async clear(this: FakeDriver, elementId: string) {
    await this.setValue('', elementId);
  },

  /**
   * This comment should be displayed instead of the one from ExternalDriver
   */
  async click(this: FakeDriver, elementId: string) {
    this.assertNoAlert();
    const el = this.getElement(elementId);
    if (!el.isVisible()) {
      throw new errors.InvalidElementStateError();
    }
    el.click();
    this.focusedElId = elementId;
  },

  async getAttribute(this: FakeDriver, attr: string, elementId: string) {
    const el = this.getElement(elementId);
    return el.getAttr(attr);
  },

  async getElementRect(this: FakeDriver, elementId: string) {
    const el = this.getElement(elementId);
    return el.getElementRect();
  },

  async getSize(this: FakeDriver, elementId: string) {
    const el = this.getElement(elementId);
    return el.getSize();
  },

  async equalsElement(this: FakeDriver, elementIdA: string, elementIdB: string) {
    const el1 = this.getElement(elementIdA);
    const el2 = this.getElement(elementIdB);
    return el1.equals(el2);
  },

  async getCssProperty(this: FakeDriver, prop: string, elementId: string) {
    this.assertWebviewContext();
    const el = this.getElement(elementId);
    return el.getCss(prop) ?? '';
  },

  async getLocation(this: FakeDriver, elementId: string) {
    const el = this.getElement(elementId);
    return el.getLocation();
  },

  async getLocationInView(this: FakeDriver, elementId: string) {
    return this.getLocation(elementId);
  },
};

mixin(ElementsMixin);
