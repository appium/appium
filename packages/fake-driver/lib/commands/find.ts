import _ from 'lodash';
import type {Element} from '@appium/types';
import {errors} from 'appium/driver';
import {FakeElement, type XmlNodeLike} from '../fake-element';
import type {FakeDriver} from '../driver';
import {util} from 'appium/support';

const {W3C_WEB_ELEMENT_IDENTIFIER} = util;

/** Find an existing element id in elMap for the same underlying node (reference equality). */
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

/** Accepts either a FakeElement (reuse existing id) or a raw XmlNodeLike from xpath. */
export function wrapNewEl(
  this: FakeDriver,
  obj: FakeElement | XmlNodeLike
): Element {
  const node: XmlNodeLike = _.has(obj, 'node') && (obj as FakeElement).node
      ? (obj as FakeElement).node
      : (obj as XmlNodeLike);

  if (_.has(obj, 'node')) {
    const existingElId = this.getExistingElementForNode(obj as FakeElement);
    if (existingElId) {
      return {ELEMENT: existingElId, [W3C_WEB_ELEMENT_IDENTIFIER]: existingElId};
    }
  } else {
    // raw node: reuse id if we already have an element for this node
    for (const [id, el] of _.toPairs(this.elMap)) {
      if (el.node === node) {
        return {ELEMENT: id, [W3C_WEB_ELEMENT_IDENTIFIER]: id};
      }
    }
  }

  this.maxElId++;
  const maxElId = this.maxElId.toString();
  this.elMap[maxElId] = new FakeElement(node, this.appModel);
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
  // Map WebDriver locator strategy to FakeApp query method name.
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
      return els.map((el) => this.wrapNewEl(el as XmlNodeLike));
    }
    return this.wrapNewEl(els[0] as XmlNodeLike);
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

// Protocol passes (strategy, selector, elementId) for find-from-element routes.

export async function findElements(
  this: FakeDriver,
  strategy: string,
  selector: string
): Promise<Element[]> {
  return this.findElOrEls(strategy, selector, true);
}

export async function findElementFromElement(
  this: FakeDriver,
  strategy: string,
  selector: string,
  elementId: string
): Promise<Element> {
  const el = this.getElement(elementId);
  return this.findElOrEls(strategy, selector, false, el.xmlFragment);
}

export async function findElementsFromElement(
  this: FakeDriver,
  strategy: string,
  selector: string,
  elementId: string
): Promise<Element[]> {
  const el = this.getElement(elementId);
  return this.findElOrEls(strategy, selector, true, el.xmlFragment);
}
