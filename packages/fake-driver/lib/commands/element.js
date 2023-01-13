import _ from 'lodash';
import {errors} from 'appium/driver';
export default {
  /**
   * @this {FakeDriver}
   */
  getElements(elIds) {
    for (let elId of elIds) {
      if (!_.has(this.elMap, elId)) {
        throw new errors.StaleElementReferenceError();
      }
    }
    return elIds.map((e) => this.elMap[e]);
  },

  /**
   * @this {FakeDriver}
   */
  getElement(elId) {
    return this.getElements([elId])[0];
  },

  /**
   * @this {FakeDriver}
   */
  async getName(elementId) {
    let el = this.getElement(elementId);
    return el.tagName;
  },

  /**
   * @this {FakeDriver}
   */
  async elementDisplayed(elementId) {
    let el = this.getElement(elementId);
    return el.isVisible();
  },

  /**
   * @this {FakeDriver}
   */
  async elementEnabled(elementId) {
    let el = this.getElement(elementId);
    return el.isEnabled();
  },

  /**
   * @this {FakeDriver}
   */
  async elementSelected(elementId) {
    let el = this.getElement(elementId);
    return el.isSelected();
  },

  /**
   * @this {FakeDriver}
   */
  async setValue(keys, elementId) {
    let value = keys;
    if (keys instanceof Array) {
      value = keys.join('');
    }
    let el = this.getElement(elementId);
    if (el.type !== 'MockInputField') {
      throw new errors.InvalidElementStateError();
    }
    el.setAttr('value', value);
  },

  /**
   * @this {FakeDriver}
   */
  async getText(elementId) {
    let el = this.getElement(elementId);
    return el.getAttr('value');
  },

  /**
   * @this {FakeDriver}
   */
  async clear(elementId) {
    await this.setValue('', elementId);
  },

  /**
   * This comment should be displayed instead of the one from ExternalDriver
   * @param {string} elementId
   * @this {FakeDriver}
   */
  async click(elementId) {
    this.assertNoAlert();
    let el = this.getElement(elementId);
    if (!el.isVisible()) {
      throw new errors.InvalidElementStateError();
    }
    el.click();
    this.focusedElId = elementId;
  },

  /**
   * @this {FakeDriver}
   */
  async getAttribute(attr, elementId) {
    let el = this.getElement(elementId);
    return el.getAttr(attr);
  },

  /**
   * @this {FakeDriver}
   */
  getElementRect(elementId) {
    let el = this.getElement(elementId);
    return el.getElementRect();
  },

  /**
   * @this {FakeDriver}
   */
  getSize(elementId) {
    let el = this.getElement(elementId);
    return el.getSize();
  },

  /**
   * @this {FakeDriver}
   */
  equalsElement(el1Id, el2Id) {
    let el1 = this.getElement(el1Id);
    let el2 = this.getElement(el2Id);
    return el1.equals(el2);
  },

  /**
   * @this {FakeDriver}
   */
  async getCssProperty(prop, elementId) {
    this.assertWebviewContext();
    let el = this.getElement(elementId);
    return el.getCss(prop);
  },

  /**
   * @param {string} elementId
   * @this {FakeDriver}
   */
  async getLocation(elementId) {
    const el = this.getElement(elementId);
    return el.getLocation();
  },

  /**
   * @this {FakeDriver}
   */
  async getLocationInView(elementId) {
    return this.getLocation(elementId);
  },
};

/**
 * @typedef {import('../driver').FakeDriver} FakeDriver
 */
