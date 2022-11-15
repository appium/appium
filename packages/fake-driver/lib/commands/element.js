import _ from 'lodash';
import {errors} from 'appium/driver';

/**
 * @template {Class<import('../types').IContextsCommands & import('../types').IAlertCommands>} T
 * @param {T} Base
 */
export function ElementMixin(Base) {
  /**
   * @implements {IElementCommands}
   */
  class ElementCommands extends Base {
    getElements(elIds) {
      for (let elId of elIds) {
        if (!_.has(this.elMap, elId)) {
          throw new errors.StaleElementReferenceError();
        }
      }
      return elIds.map((e) => this.elMap[e]);
    }

    getElement(elId) {
      return this.getElements([elId])[0];
    }

    async getName(elementId) {
      let el = this.getElement(elementId);
      return el.tagName;
    }

    async elementDisplayed(elementId) {
      let el = this.getElement(elementId);
      return el.isVisible();
    }

    async elementEnabled(elementId) {
      let el = this.getElement(elementId);
      return el.isEnabled();
    }

    async elementSelected(elementId) {
      let el = this.getElement(elementId);
      return el.isSelected();
    }

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
    }

    async getText(elementId) {
      let el = this.getElement(elementId);
      return el.getAttr('value');
    }

    async clear(elementId) {
      await this.setValue('', elementId);
    }

    async click(elementId) {
      this.assertNoAlert();
      let el = this.getElement(elementId);
      if (!el.isVisible()) {
        throw new errors.InvalidElementStateError();
      }
      el.click();
      this.focusedElId = elementId;
    }

    async getAttribute(attr, elementId) {
      let el = this.getElement(elementId);
      return el.getAttr(attr);
    }
    getElementRect(elementId) {
      let el = this.getElement(elementId);
      return el.getElementRect();
    }
    getSize(elementId) {
      let el = this.getElement(elementId);
      return el.getSize();
    }

    equalsElement(el1Id, el2Id) {
      let el1 = this.getElement(el1Id);
      let el2 = this.getElement(el2Id);
      return el1.equals(el2);
    }

    async getCssProperty(prop, elementId) {
      this.assertWebviewContext();
      let el = this.getElement(elementId);
      return el.getCss(prop);
    }

    getLocationInView = this.getLocation;
  }

  return ElementCommands;
}

/**
 * @typedef {import('../driver').FakeDriverCore} FakeDriverCore
 * @typedef {import('../types').IElementCommands} IElementCommands
 */

/**
 * @template T,[U={}],[V=Array<any>]
 * @typedef {import('@appium/types').Class<T,U,V>} Class
 */
