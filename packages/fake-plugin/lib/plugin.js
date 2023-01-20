// @ts-check
/* eslint-disable no-case-declarations */

import {BasePlugin} from 'appium/plugin';
import B from 'bluebird';

/**
 * An example plugin for Appium that demonstrate the implementations.
 *
 * @implements {Plugin}
 */
class FakePlugin extends BasePlugin {
  fakeThing = 'PLUGIN_FAKE_THING';

  // Map route path to  to HTTP methods and command details
  static newMethodMap = /** @type {const} */ ({
    '/session/:sessionId/fake_data': {
      GET: {command: 'getFakeSessionData', neverProxy: true},
      POST: {
        command: 'setFakeSessionData',
        payloadParams: {required: ['data']},
        neverProxy: true,
      },
    },
    '/session/:sessionId/fakepluginargs': {
      GET: {command: 'getFakePluginArgs', neverProxy: true},
    },
  });

  /** @type {string?} */
  static _unexpectedData = null;

  static executeMethodMap = /** @type {const} */ ({
    // this execute method overrides fake-drivers fake: getThing, for testing
    'fake: getThing': {
      command: 'getFakeThing',
    },

    // this is a totally new execute method
    'fake: plugMeIn': {
      command: 'plugMeIn',
      params: {required: ['socket']},
    },
  });

  /**
   * A route handler function for /fake that sends a JSON string representing a fake response.
   *
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   */
  static fakeRoute(req, res) {
    res.send(JSON.stringify({fake: 'fakeResponse'}));
  }

  /**
   * A route handler function for /unexpected
   *
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   */
  static unexpectedData(req, res) {
    res.send(JSON.stringify(FakePlugin._unexpectedData));
    FakePlugin._unexpectedData = null;
  }

  /**
   *
   * @type {import('@appium/types').UpdateServerCallback}
   */
  // eslint-disable-next-line no-unused-vars,require-await
  static async updateServer(expressApp, httpServer, cliArgs) {
    expressApp.all('/fake', FakePlugin.fakeRoute);
    expressApp.all('/unexpected', FakePlugin.unexpectedData);
    expressApp.all('/cliArgs', (req, res) => {
      res.send(JSON.stringify(cliArgs));
    });
  }

  async getFakeThing() {
    await B.delay(1);
    return this.fakeThing;
  }

  async plugMeIn(next, driver, /** @type {string} */ socket) {
    await B.delay(1);
    return `Plugged in to ${socket}`;
  }

  async getFakePluginArgs() {
    await B.delay(1);
    return this.cliArgs;
  }

  /**
   * @type {PluginCommand}
   */
  async getPageSource(next, driver, ...args) {
    await B.delay(10);
    return `<Fake>${JSON.stringify(args)}</Fake>`;
  }

  /**
   * @type {PluginCommand}
   */
  async findElement(next, driver, ...args) {
    this.logger.info(`Before findElement is run with args ${JSON.stringify(args)}`);
    const originalRes = await next();
    this.logger.info(`After findElement is run`);
    // @ts-ignore
    originalRes.fake = true;
    return originalRes;
  }

  /**
   * @type {PluginCommand}
   */
  async getFakeSessionData(next, driver) {
    await B.delay(1);
    // @ts-ignore
    return driver.fakeSessionData || null;
  }

  /**
   * @type {PluginCommand}
   */
  async setFakeSessionData(next, driver, ...args) {
    await B.delay(1);
    // @ts-ignore
    driver.fakeSessionData = args[0];
    return null;
  }

  /**
   * @type {PluginCommand}
   */
  async getWindowHandle(next) {
    const handle = await next();
    return `<<${handle}>>`;
  }

  /**
   *
   * @param {import('@appium/types').ExternalDriver} driver - The driver instance
   * @param {string} cause - The cause of the shutdown
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line require-await
  async onUnexpectedShutdown(driver, cause) {
    FakePlugin._unexpectedData = `Session ended because ${cause}`;
  }

  async execute(next, driver, script, args) {
    return await this.executeMethod(next, driver, script, args);
  }
}

export {FakePlugin};
export default FakePlugin;

/**
 * @typedef {Record<string,unknown>} CLIArgs
 */

/**
 * @typedef {import('@appium/types').Plugin} Plugin
 */

/**
 * @typedef {import('express').Request} Request
 */

/**
 * @typedef {import('express').Response} Response
 */

/**
 * @typedef {import('@appium/types').PluginCommand} PluginCommand
 */
