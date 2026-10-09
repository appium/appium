import type {Element, ExternalDriver, NextPluginCallback} from '@appium/types';
import {errors} from 'appium/driver.js';
import {BasePlugin} from 'appium/plugin.js';

import {transformSourceXml} from './source.js';
import type {TransformMetadata} from './types.js';
import {transformQuery} from './xpath.js';

const NATIVE_CONTEXT = 'NATIVE_APP';
const UNIVERSAL_CONTEXT = 'universal-xml';

type ContextEntry = string | {id: string; [key: string]: unknown};

export class UniversalXMLPlugin extends BasePlugin {
  // Driver objects belong to individual sessions. Weak keys do not retain ended sessions.
  private readonly nativeSourceSessions = new WeakSet<ExternalDriver>();

  async getContexts(next: NextPluginCallback, driver: ExternalDriver): Promise<ContextEntry[]> {
    const contexts = (await next()) as ContextEntry[];
    const contextId = (context: ContextEntry) => (typeof context === 'string' ? context : context.id);
    const nativeContext = contexts.find((context) => contextId(context) === NATIVE_CONTEXT);
    if (
      !supportsContextSwitching(driver) ||
      !nativeContext ||
      contexts.some((context) => contextId(context) === UNIVERSAL_CONTEXT)
    ) {
      return contexts;
    }
    const universalContext =
      typeof nativeContext === 'string' ? UNIVERSAL_CONTEXT : {...nativeContext, id: UNIVERSAL_CONTEXT};
    return [...contexts, universalContext];
  }

  async getCurrentContext(next: NextPluginCallback, driver: ExternalDriver): Promise<string | null> {
    const context = (await next()) as string | null;
    return context === NATIVE_CONTEXT && supportsContextSwitching(driver) && !this.nativeSourceSessions.has(driver)
      ? UNIVERSAL_CONTEXT
      : context;
  }

  async setContext(next: NextPluginCallback, driver: ExternalDriver, name: string | null): Promise<unknown> {
    if (name !== UNIVERSAL_CONTEXT) {
      // Commit the mode only after the real driver accepts the requested context.
      const result = await next();
      this.nativeSourceSessions.add(driver);
      return result;
    }
    if (!supportsContextSwitching(driver) || !driver.getCurrentContext || !driver.setContext) {
      throw new errors.NoSuchContextError(`The driver does not support the '${UNIVERSAL_CONTEXT}' context`);
    }
    if ((await driver.getCurrentContext()) !== NATIVE_CONTEXT) {
      await driver.setContext(NATIVE_CONTEXT);
    }
    this.nativeSourceSessions.delete(driver);
    return null;
  }

  async deleteSession(next: NextPluginCallback, driver: ExternalDriver): Promise<unknown> {
    try {
      return await next();
    } finally {
      this.nativeSourceSessions.delete(driver);
    }
  }

  private async shouldTransformSource(driver: ExternalDriver): Promise<boolean> {
    return (
      !this.nativeSourceSessions.has(driver) &&
      (!driver.getCurrentContext || (await driver.getCurrentContext()) === NATIVE_CONTEXT)
    );
  }
  async getPageSource(
    next: NextPluginCallback | null,
    driver: ExternalDriver,
    sessId?: any,
    addIndexPath: boolean = false,
  ): Promise<string> {
    void sessId;
    const source = (next ? await next() : await driver.getPageSource()) as string;
    if (!(await this.shouldTransformSource(driver))) {
      return source;
    }
    const metadata: TransformMetadata = {};
    const platformName = getPlatformName(driver);
    if (platformName.toLowerCase() === 'android') {
      metadata.appPackage = (driver.opts as Record<string, unknown>)?.appPackage as string;
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
          unknowns.nodes.join(', '),
      );
    }
    if (unknowns.attrs.length) {
      this.log.warn(
        `The XML mapper found ${unknowns.attrs.length} attributes ` +
          `that it didn't know about. These should be reported to ` +
          `improve the quality of the plugin: ` +
          unknowns.attrs.join(', '),
      );
    }
    return xml;
  }

  async findElement(
    next: NextPluginCallback,
    driver: ExternalDriver,
    strategy: string,
    selector: string,
  ): Promise<Element> {
    return (await this._find(false, next, driver, strategy, selector)) as Element;
  }

  async findElements(
    next: NextPluginCallback,
    driver: ExternalDriver,
    strategy: string,
    selector: string,
  ): Promise<Element[]> {
    return (await this._find(true, next, driver, strategy, selector)) as Element[];
  }

  private async _find(
    multiple: false,
    next: NextPluginCallback,
    driver: ExternalDriver,
    strategy: string,
    selector: string,
  ): Promise<Element>;
  private async _find(
    multiple: true,
    next: NextPluginCallback,
    driver: ExternalDriver,
    strategy: string,
    selector: string,
  ): Promise<Element[]>;
  private async _find(
    multiple: boolean,
    next: NextPluginCallback,
    driver: ExternalDriver,
    strategy: string,
    selector: string,
  ): Promise<Element | Element[]> {
    if (
      this.nativeSourceSessions.has(driver) ||
      strategy.toLowerCase() !== 'xpath' ||
      !driver.getCurrentContext ||
      (await driver.getCurrentContext()) !== NATIVE_CONTEXT
    ) {
      return (await next()) as Element | Element[];
    }
    const xml = await this.getPageSource(null, driver, null, true);
    const newSelector = transformQuery(selector, xml, multiple);

    // if the selector was not able to be transformed, that means no elements were found that
    // matched, so do the appropriate thing based on element vs elements
    if (newSelector === null) {
      this.log.warn(
        `Selector was not able to be translated to underlying XML. Either the requested ` +
          `element does not exist or there was an error in translation`,
      );
      if (multiple) {
        return [];
      }
      throw new errors.NoSuchElementError();
    }

    this.log.info(`Selector was translated to: ${newSelector}`);

    // otherwise just run the transformed query!
    const finder = multiple ? 'findElements' : 'findElement';
    return (await driver[finder](strategy, newSelector)) as Element | Element[];
  }
}

function getPlatformName(driver: ExternalDriver): string {
  return ((driver.caps as Record<string, unknown>)?.platformName as string) || '';
}

function supportsContextSwitching(driver: ExternalDriver): boolean {
  return (
    ['ios', 'android'].includes(getPlatformName(driver).toLowerCase()) &&
    Boolean(driver.getCurrentContext && driver.setContext)
  );
}
