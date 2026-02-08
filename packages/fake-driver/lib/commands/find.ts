import _ from 'lodash';
import {Element} from '@appium/types';
import {errors} from 'appium/driver';
import {FakeElement} from '../fake-element';
import {FakeDriver} from '../driver';
import {util} from 'appium/support';
import {mixin} from './mixin';

const {W3C_WEB_ELEMENT_IDENTIFIER} = util;

async function findElOrEls<Ctx = any>(
  this: FakeDriver<any>,
  strategy: string,
  selector: string,
  mult: true,
  context?: Ctx
): Promise<Element[]>;
async function findElOrEls<Ctx = any>(
  this: FakeDriver<any>,
  strategy: string,
  selector: string,
  mult: false,
  context?: Ctx
): Promise<Element>;
async function findElOrEls<Ctx = any>(
  this: FakeDriver<any>,
  strategy: string,
  selector: string,
  mult: boolean,
  context?: Ctx
): Promise<Element | Element[]> {
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
  const methodName = qMap[strategy];
  const raw = (this.appModel[methodName] as (sel: string, ctx?: unknown) => unknown).call(
    this.appModel,
    selector,
    context
  );
  const els = _.isArray(raw) ? raw : raw ? [raw] : [];

  let retval: Element | Element[];
  if (els.length) {
    if (mult) {
      const allEls: Element[] = [];
      for (const el of els) {
        allEls.push(this.wrapNewEl(el as import('../fake-element').FakeElement));
      }
      retval = allEls;
    } else {
      retval = this.wrapNewEl(els[0] as import('../fake-element').FakeElement);
    }
  } else if (mult) {
    retval = [];
  } else {
    throw new errors.NoSuchElementError();
  }
  return retval;
}

interface FakeDriverFindMixin {
  getExistingElementForNode(node: FakeElement): string | null;
  wrapNewEl(obj: FakeElement): Element;

  findElOrEls(
    this: FakeDriver,
    strategy: string,
    selector: string,
    mult: true,
    context?: any
  ): Promise<Element[]>;
  findElOrEls(
    this: FakeDriver,
    strategy: string,
    selector: string,
    mult: false,
    context?: any
  ): Promise<Element>;
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
  getExistingElementForNode(this: FakeDriver, node: FakeElement) {
    for (const [id, el] of _.toPairs(this.elMap)) {
      if (el.node === node.node) {
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
    this.elMap[maxElId] = new FakeElement(obj.node, this.appModel);
    return {ELEMENT: maxElId, [W3C_WEB_ELEMENT_IDENTIFIER]: maxElId};
  },

  findElOrEls,

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
