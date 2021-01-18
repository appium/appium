/* eslint-disable no-case-declarations */

import BasePlugin from '@appium/base-plugin';
import { transformSourceXml } from './source';
import log from './logger';


export default class UniversalXMLPlugin extends BasePlugin {

  commands = ['getPageSource', 'findElement', 'findElements', 'findElementFromElement',
    'findElementsFromElement'];

  async handle (next, driver, cmdName/*, ...args*/) {
    if (cmdName === 'getPageSource') {
      const source = await driver.getPageSource();
      const transformMetadata = {appPackage: driver.opts.appPackage};
      const {platformName} = driver.caps;
      const {xml, unknowns} = transformSourceXml(source,
        platformName.toLowerCase(), transformMetadata);
      if (unknowns.nodes.length) {
        log.warn(`The XML mapper found ${unknowns.nodes.length} node(s) / ` +
                 `tag name(s) that it didn't know about. These should be ` +
                 `reported to improve the quality of the plugin: ` +
                 unknowns.nodes.join(', '));
      }
      if (unknowns.attrs.length) {
        log.warn(`The XML mapper found ${unknowns.attrs.length} attributes ` +
                 `that it didn't know about. These should be reported to ` +
                 `improve the quality of the plugin: ` +
                 unknowns.attrs.join(', '));
      }
      return xml;
    }
    return await next();
  }
}

export { UniversalXMLPlugin };
