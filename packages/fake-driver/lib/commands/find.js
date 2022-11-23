import _ from 'lodash';
import {errors} from 'appium/driver';
import {FakeElement} from '../fake-element';

/**
 * @template {Class<import('../types').IElementCommands>} T
 * @param {T} Base
 */
export function FindMixin(Base) {
  /**
   * @implements {IFindCommands}
   */
  class FindCommands extends Base {
    getExistingElementForNode(node) {
      for (let [id, el] of _.toPairs(this.elMap)) {
        if (el.node === node) {
          return id;
        }
      }
      return null;
    }

    wrapNewEl(obj) {
      // first check and see if we already have a ref to this element
      let existingElId = this.getExistingElementForNode(obj);
      if (existingElId) {
        return {ELEMENT: existingElId};
      }

      // otherwise add the element to the map
      this.maxElId++;
      this.elMap[this.maxElId.toString()] = new FakeElement(obj, this.appModel);
      return {ELEMENT: this.maxElId.toString()};
    }
    /**
     * @template {boolean} Mult
     * @template [Ctx=any]
     * @param {string} strategy
     * @param {string} selector
     * @param {Mult} mult
     * @param {Ctx} [context]
     * @returns {Promise<Mult extends true ? Element[] : Element>}
     */
    async findElOrEls(strategy, selector, mult, context) {
      let qMap = {
        xpath: 'xpathQuery',
        id: 'idQuery',
        'accessibility id': 'idQuery',
        'class name': 'classQuery',
        'tag name': 'classQuery',
        'css selector': 'cssQuery',
      };
      // TODO this error checking should probably be part of MJSONWP?
      if (!_.includes(_.keys(qMap), strategy)) {
        throw new errors.UnknownCommandError();
      }
      if (selector === 'badsel') {
        throw new errors.InvalidSelectorError();
      }
      let els = this.appModel[qMap[strategy]](selector, context);

      let retval;
      if (els.length) {
        if (mult) {
          let allEls = [];
          for (let el of els) {
            allEls.push(this.wrapNewEl(el));
          }
          retval = allEls;
        } else {
          retval = this.wrapNewEl(els[0]);
        }
      } else if (mult) {
        retval = [];
      } else {
        throw new errors.NoSuchElementError();
      }
      return /** @type {Mult extends true ? Element[] : Element} */ (retval);
    }

    async findElement(strategy, selector) {
      return this.findElOrEls(strategy, selector, false);
    }

    async findElements(strategy, selector) {
      return this.findElOrEls(strategy, selector, true);
    }

    async findElementFromElement(strategy, selector, elementId) {
      let el = this.getElement(elementId);
      return this.findElOrEls(strategy, selector, false, el.xmlFragment);
    }

    async findElementsFromElement(strategy, selector, elementId) {
      let el = this.getElement(elementId);
      return this.findElOrEls(strategy, selector, true, el.xmlFragment);
    }
  }

  return FindCommands;
}

/**
 * @typedef {import('../driver').FakeDriverCore} FakeDriverCore
 * @typedef {import('@appium/types').Element} Element

 */

/**
 * @template T,[U={}],[V=Array<any>]
 * @typedef {import('@appium/types').Class<T,U,V>} Class
 */

/**
 * @template [Ctx=any]
 * @typedef {import('@appium/types').IFindCommands<Ctx>} IFindCommands
 */
