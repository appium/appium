import _ from 'lodash';
import {Element} from '@appium/types';
import {errors} from 'appium/driver';
import {FakeElement} from '../fake-element';
import {FakeDriver} from '../driver';
import {util} from '@appium/support';
import {mixin} from './mixin';

const {W3C_WEB_ELEMENT_IDENTIFIER} = util;
interface FakeDriverFindMixin {
  getExistingElementForNode(node: FakeElement): string | null;
  wrapNewEl(obj: FakeElement): Element;

  findElOrEls<Many extends boolean, Ctx = any>(
    this: FakeDriver,
    strategy: string,
    selector: string,
    many: Many,
    context?: Ctx
  ): Promise<Many extends true ? Element[] : Element>;
  findElement(strategy: string, selector: string): Promise<Element>;
  findElements(strategy: string, selector: string): Promise<Element[]>;
  findElementFromElement(elementId: string, strategy: string, selector: string): Promise<Element>;
  findElementsFromElement(
    elementId: string,
    strategy: string,
    selector: string
  ): Promise<Element[]>;
}

declare module '../driver' {
  interface FakeDriver extends FakeDriverFindMixin {}
}

const FindMixin: FakeDriverFindMixin = {
  getExistingElementForNode(this: FakeDriver, node) {
    for (const [id, el] of _.toPairs(this.elMap)) {
      if (el.node === node) {
        return id;
      }
    }
    return null;
  },

  wrapNewEl(this: FakeDriver, obj: FakeElement): Element {
    // first check and see if we already have a ref to this element
    const existingElId = this.getExistingElementForNode(obj);
    if (existingElId) {
      return {ELEMENT: existingElId, [W3C_WEB_ELEMENT_IDENTIFIER]: existingElId};
    }

    // otherwise add the element to the map
    this.maxElId++;
    const maxElId = this.maxElId.toString();
    this.elMap[maxElId] = new FakeElement(obj, this.appModel);
    return {ELEMENT: maxElId, [W3C_WEB_ELEMENT_IDENTIFIER]: maxElId};
  },

  async findElOrEls<Many extends boolean, Ctx = any>(
    this: FakeDriver,
    strategy: string,
    selector: string,
    many: Many,
    context: Ctx
  ): Promise<Many extends true ? Element[] : Element> {
    const qMap = {
      xpath: 'xpathQuery',
      id: 'idQuery',
      'accessibility id': 'idQuery',
      'class name': 'classQuery',
      'tag name': 'classQuery',
      'css selector': 'cssQuery',
    } as Record<string, keyof FakeDriver['appModel']>;
    // TODO this error checking should probably be part of MJSONWP?
    if (!_.includes(_.keys(qMap), strategy)) {
      throw new errors.UnknownCommandError();
    }
    if (selector === 'badsel') {
      throw new errors.InvalidSelectorError();
    }
    const els = this.appModel[qMap[strategy]](selector, context);

    let retval: Element | Element[];
    if (els.length) {
      if (many) {
        const allEls: Element[] = [];
        for (const el of els) {
          allEls.push(this.wrapNewEl(el));
        }
        retval = allEls;
      } else {
        retval = this.wrapNewEl(els[0]);
      }
    } else if (many) {
      retval = [];
    } else {
      throw new errors.NoSuchElementError();
    }
    return retval as Many extends true ? Element[] : Element;
  },

  /**
   * This should override whatever's in ExternalDriver
   * @param {string} strategy Strategy
   * @param {string} selector Selector
   * @this {FakeDriver}
   */
  async findElement(this: FakeDriver, strategy: string, selector: string) {
    return this.findElOrEls(strategy, selector, false);
  },

  async findElements(this: FakeDriver, strategy: string, selector: string) {
    return this.findElOrEls(strategy, selector, true);
  },

  async findElementFromElement(
    this: FakeDriver,
    strategy: string,
    selector: string,
    elementId: string
  ) {
    const el = this.getElement(elementId);
    return this.findElOrEls(strategy, selector, false, el.xmlFragment);
  },

  async findElementsFromElement(
    this: FakeDriver,
    strategy: string,
    selector: string,
    elementId: string
  ) {
    const el = this.getElement(elementId);
    return this.findElOrEls(strategy, selector, true, el.xmlFragment);
  },
};

mixin(FindMixin);
