import _ from 'lodash';
import { errors } from 'appium-base-driver';
import { FakeElement } from '../fake-element';

let commands = {}, helpers = {}, extensions = {};

helpers.getExistingElementForNode = function getExistingElementForNode (node) {
  for (let [id, el] of _.toPairs(this.elMap)) {
    if (el.node === node) {
      return id;
    }
  }
  return null;
};

helpers.wrapNewEl = function wrapNewEl (obj) {
  // first check and see if we already have a ref to this element
  let existingElId = this.getExistingElementForNode(obj);
  if (existingElId) {
    return {ELEMENT: existingElId};
  }

  // otherwise add the element to the map
  this.maxElId++;
  this.elMap[this.maxElId.toString()] = new FakeElement(obj, this.appModel);
  return {ELEMENT: this.maxElId.toString()};
};

helpers.findElOrEls = async function findElOrEls (strategy, selector, mult, ctx) {
  let qMap = {
    'xpath': 'xpathQuery',
    'id': 'idQuery',
    'accessibility id': 'idQuery',
    'class name': 'classQuery',
    'tag name': 'classQuery'
  };
  // TODO this error checking should probably be part of MJSONWP?
  if (!_.includes(_.keys(qMap), strategy)) {
    throw new errors.UnknownCommandError();
  }
  if (selector === 'badsel') {
    throw new errors.InvalidSelectorError();
  }
  let els = this.appModel[qMap[strategy]](selector, ctx);
  if (els.length) {
    if (mult) {
      let allEls = [];
      for (let el of els) {
        allEls.push(this.wrapNewEl(el));
      }
      return allEls;
    } else {
      return this.wrapNewEl(els[0]);
    }
  } else if (mult) {
    return [];
  } else {
    throw new errors.NoSuchElementError();
  }
};

commands.findElement = async function findElement (strategy, selector) {
  return this.findElOrEls(strategy, selector, false);
};

commands.findElements = async function findElements (strategy, selector) {
  return this.findElOrEls(strategy, selector, true);
};

commands.findElementFromElement = async function findElementFromElement (strategy, selector, elementId) {
  let el = this.getElement(elementId);
  return this.findElOrEls(strategy, selector, false, el.xmlFragment);
};

commands.findElementsFromElement = async function findElementsFromElement (strategy, selector, elementId) {
  let el = this.getElement(elementId);
  return this.findElOrEls(strategy, selector, true, el.xmlFragment);
};

Object.assign(extensions, commands, helpers);
export { commands, helpers};
export default extensions;
