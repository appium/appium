/* eslint-disable no-case-declarations */

import BasePlugin from 'appium/plugin';
import {errors} from 'appium/driver';
import {transformSourceXml} from './source';
import {transformQuery} from './xpath';
import log from './logger';

/**
 *
 * @extends {BasePlugin}
 */
export default class UniversalXMLPlugin extends BasePlugin {
  commands = [
    'getPageSource',
    'findElement',
    'findElements',
    'findElementFromElement',
    'findElementsFromElement',
  ];

  /**
   *
   * @param {Function} next - The function to be executed after this one
   * @param {ExtDriver} driver
   * @param {string} sessId
   * @param {boolean} addIndexPath
   * @returns
   */
  async getPageSource(next, driver, sessId, addIndexPath = false) {
    /**
     * @type {string?}
     */
    const source = next ? await next() : await driver.getPageSource();
    const metadata = {};
    const {platformName} = driver.caps;
    if (platformName.toLowerCase() === 'android') {
      metadata.appPackage = driver.opts.appPackage;
    }
    const {xml, unknowns} = transformSourceXml(source, platformName.toLowerCase(), {
      metadata,
      addIndexPath,
    });
    if (unknowns.nodes.length) {
      log.warn(
        `The XML mapper found ${unknowns.nodes.length} node(s) / ` +
          `tag name(s) that it didn't know about. These should be ` +
          `reported to improve the quality of the plugin: ` +
          unknowns.nodes.join(', ')
      );
    }
    if (unknowns.attrs.length) {
      log.warn(
        `The XML mapper found ${unknowns.attrs.length} attributes ` +
          `that it didn't know about. These should be reported to ` +
          `improve the quality of the plugin: ` +
          unknowns.attrs.join(', ')
      );
    }
    return xml;
  }

  /**
   *
   * @param {Function} next
   * @param {ExtDriver} driver
   * @param {string} strategy
   * @param {string} selector
   * @returns
   */
  async findElement(next, driver, strategy, selector) {
    return await this._find(false, next, driver, strategy, selector);
  }

  /**
   *
   * @param {Function} next
   * @param {ExtDriver} driver
   * @param {string} strategy
   * @param {string} selector
   * @returns
   */
  async findElements(next, driver, strategy, selector) {
    return await this._find(true, next, driver, strategy, selector);
  }

  /**
   *
   * @param {boolean} multiple
   * @param {Function} next
   * @param {ExtDriver} driver
   * @param {string} strategy
   * @param {string} selector
   * @returns
   */
  async _find(multiple, next, driver, strategy, selector) {
    const {platformName} = driver.caps;
    if (strategy.toLowerCase() !== 'xpath') {
      return await next();
    }
    const xml = await this.getPageSource(null, driver, null, true);
    let newSelector = transformQuery(selector, xml, multiple);

    // if the selector was not able to be transformed, that means no elements were found that
    // matched, so do the appropriate thing based on element vs elements
    if (newSelector === null) {
      log.warn(
        `Selector was not able to be translated to underlying XML. Either the requested ` +
          `element does not exist or there was an error in translation`
      );
      if (multiple) {
        return [];
      }
      throw new errors.NoSuchElementError();
    }

    if (platformName.toLowerCase() === 'ios') {
      // with the XCUITest driver, the <AppiumAUT> wrapper element is present in the source but is
      // not present in the source considered by WDA, so our index path based xpath queries will
      // not work with WDA as-is. We need to remove the first path segment.
      newSelector = newSelector.replace(/^\/\*\[1\]/, '');
    }
    log.info(`Selector was translated to: ${newSelector}`);

    // otherwise just run the transformed query!
    const finder = multiple ? 'findElements' : 'findElement';
    return await driver[finder](strategy, newSelector);
  }
}

export {UniversalXMLPlugin};

/**
 * @typedef {import('@appium/types').ExternalDriver} ExtDriver
 */
