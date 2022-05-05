/* eslint-disable no-case-declarations */

import BasePlugin from '@appium/base-plugin';
import B from 'bluebird';

export default class FakePlugin extends BasePlugin {
  constructor(pluginName, opts = {}) {
    super(pluginName, opts);
  }

  async getFakePluginArgs() {
    await B.delay(1);
    return this.cliArgs;
  }

  static newMethodMap = {
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
  };

  static _unexpectedData = null;

  static fakeRoute(req, res) {
    res.send(JSON.stringify({fake: 'fakeResponse'}));
  }

  static unexpectedData(req, res) {
    res.send(JSON.stringify(FakePlugin._unexpectedData));
    FakePlugin._unexpectedData = null;
  }
  // eslint-disable-next-line require-await
  static async updateServer(expressApp /*, httpServer*/) {
    expressApp.all('/fake', FakePlugin.fakeRoute);
    expressApp.all('/unexpected', FakePlugin.unexpectedData);
  }

  async getPageSource(next, driver, ...args) {
    await B.delay(10);
    return `<Fake>${JSON.stringify(args)}</Fake>`;
  }

  async findElement(next, driver, ...args) {
    this.logger.info(`Before findElement is run with args ${JSON.stringify(args)}`);
    const originalRes = await next();
    this.logger.info(`After findElement is run`);
    originalRes.fake = true;
    return originalRes;
  }

  async getFakeSessionData(next, driver) {
    await B.delay(1);
    return driver.fakeSessionData || null;
  }

  async setFakeSessionData(next, driver, ...args) {
    await B.delay(1);
    driver.fakeSessionData = args[0];
    return null;
  }

  async getWindowHandle(next) {
    const handle = await next();
    return `<<${handle}>>`;
  }

  onUnexpectedShutdown(driver, cause) {
    FakePlugin._unexpectedData = `Session ended because ${cause}`;
  }
}

export {FakePlugin};
