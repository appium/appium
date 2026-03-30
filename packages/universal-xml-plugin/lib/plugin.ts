import {BasePlugin} from 'appium/plugin';
import {errors} from 'appium/driver';
import {transformSourceXml} from './source';
import {transformQuery} from './xpath';
import type {ExternalDriver, NextPluginCallback, Element} from '@appium/types';
import type {TransformMetadata} from './types';

export class UniversalXMLPlugin extends BasePlugin {
  async getPageSource(
    next: NextPluginCallback | null,
    driver: ExternalDriver,
    sessId?: any,
    addIndexPath: boolean = false
  ): Promise<string> {
    const source = (next ? await next() : await driver.getPageSource()) as string;
    const metadata: TransformMetadata = {};
    const platformName = getPlatformName(driver);
    if (platformName.toLowerCase() === 'android') {
      metadata.appPackage = (driver.opts as any)?.appPackage;
    }
    const {xml, unknowns} = await transformSourceXml(source, platformName.toLowerCase(), {
      metadata,
      addIndexPath,
    });
    if (unknowns.nodes.length) {
      this.log.warn(
        `The XML mapper found ${unknowns.nodes.length} node(s) / ` +
          `tag name(s) that it didn't know about. These should be ` +
          `reported to improve the quality of the plugin: ` +
          unknowns.nodes.join(', ')
      );
    }
    if (unknowns.attrs.length) {
      this.log.warn(
        `The XML mapper found ${unknowns.attrs.length} attributes ` +
          `that it didn't know about. These should be reported to ` +
          `improve the quality of the plugin: ` +
          unknowns.attrs.join(', ')
      );
    }
    return xml;
  }

  async findElement(
    next: NextPluginCallback,
    driver: ExternalDriver,
    strategy: string,
    selector: string
  ): Promise<Element> {
    return (await this._find(false, next, driver, strategy, selector)) as Element;
  }

  async findElements(
    next: NextPluginCallback,
    driver: ExternalDriver,
    strategy: string,
    selector: string
  ): Promise<Element[]> {
    return (await this._find(true, next, driver, strategy, selector)) as Element[];
  }

  private async _find(
    multiple: false,
    next: NextPluginCallback,
    driver: ExternalDriver,
    strategy: string,
    selector: string
  ): Promise<Element>;
  private async _find(
    multiple: true,
    next: NextPluginCallback,
    driver: ExternalDriver,
    strategy: string,
    selector: string
  ): Promise<Element[]>;
  private async _find(
    multiple: boolean,
    next: NextPluginCallback,
    driver: ExternalDriver,
    strategy: string,
    selector: string
  ): Promise<Element | Element[]> {
    const platformName = getPlatformName(driver);
    if (strategy.toLowerCase() !== 'xpath' || !driver.getCurrentContext || (await driver.getCurrentContext()) !== 'NATIVE_APP') {
      return await next() as Element | Element[];
    }
    const xml = await this.getPageSource(null, driver, null, true);
    let newSelector = transformQuery(selector, xml, multiple);

    // if the selector was not able to be transformed, that means no elements were found that
    // matched, so do the appropriate thing based on element vs elements
    if (newSelector === null) {
      this.log.warn(
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
    this.log.info(`Selector was translated to: ${newSelector}`);

    // otherwise just run the transformed query!
    const finder = multiple ? 'findElements' : 'findElement';
    return await driver[finder](strategy, newSelector) as Element | Element[];
  }
}

function getPlatformName(driver: ExternalDriver): string {
  return ((driver.caps as any)?.platformName as string) || '';
}
