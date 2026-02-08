import _ from 'lodash';
import {Element} from '@appium/types';
import {errors} from 'appium/driver';
import {FakeElement} from '../fake-element';
import type {FakeDriver} from '../driver';
import {util} from 'appium/support';

const {W3C_WEB_ELEMENT_IDENTIFIER} = util;

export function getExistingElementForNode(
  this: FakeDriver,
  node: FakeElement
): string | null {
  for (const [id, el] of _.toPairs(this.elMap)) {
    if (el.node === node.node) {
      return id;
    }
  }
  return null;
}

export function wrapNewEl(this: FakeDriver, obj: FakeElement): Element {
  const existingElId = this.getExistingElementForNode(obj);
  if (existingElId) {
    return {ELEMENT: existingElId, [W3C_WEB_ELEMENT_IDENTIFIER]: existingElId};
  }
  this.maxElId++;
  const maxElId = this.maxElId.toString();
  this.elMap[maxElId] = new FakeElement(obj.node, this.appModel);
  return {ELEMENT: maxElId, [W3C_WEB_ELEMENT_IDENTIFIER]: maxElId};
}

async function findElOrElsImpl<Ctx = unknown>(
  this: FakeDriver,
  strategy: string,
  selector: string,
  mult: true,
  context?: Ctx
): Promise<Element[]>;
async function findElOrElsImpl<Ctx = unknown>(
  this: FakeDriver,
  strategy: string,
  selector: string,
  mult: false,
  context?: Ctx
): Promise<Element>;
async function findElOrElsImpl<Ctx = unknown>(
  this: FakeDriver,
  strategy: string,
  selector: string,
  mult: boolean,
  context?: Ctx
): Promise<Element | Element[]> {
  const qMap: Record<string, 'xpathQuery' | 'idQuery' | 'classQuery' | 'cssQuery'> = {
    xpath: 'xpathQuery',
    id: 'idQuery',
    'accessibility id': 'idQuery',
    'class name': 'classQuery',
    'tag name': 'classQuery',
    'css selector': 'cssQuery',
  };
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

  if (els.length) {
    if (mult) {
      return els.map((el) => this.wrapNewEl(el as FakeElement));
    }
    return this.wrapNewEl(els[0] as FakeElement);
  }
  if (mult) {
    return [];
  }
  throw new errors.NoSuchElementError();
}

export const findElOrEls = findElOrElsImpl;

export async function findElement(
  this: FakeDriver,
  strategy: string,
  selector: string
): Promise<Element> {
  return this.findElOrEls(strategy, selector, false);
}

export async function findElements(
  this: FakeDriver,
  strategy: string,
  selector: string
): Promise<Element[]> {
  return this.findElOrEls(strategy, selector, true);
}

export async function findElementFromElement(
  this: FakeDriver,
  elementId: string,
  strategy: string,
  selector: string
): Promise<Element> {
  const el = this.getElement(elementId);
  return this.findElOrEls(strategy, selector, false, el.xmlFragment);
}

export async function findElementsFromElement(
  this: FakeDriver,
  elementId: string,
  strategy: string,
  selector: string
): Promise<Element[]> {
  const el = this.getElement(elementId);
  return this.findElOrEls(strategy, selector, true, el.xmlFragment);
}
