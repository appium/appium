/* eslint-disable no-case-declarations */

import BasePlugin from '@appium/base-plugin';


export default class UniversalXMLPlugin extends BasePlugin {

  commands = ['getPageSource', 'findElement', 'findElements', 'findElementFromElement',
    'findElementsFromElement'];

  async handle (next, /*driver, cmdName, ...args*/) {
    return await next();
  }
}

export { UniversalXMLPlugin };
