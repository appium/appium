/* eslint-disable no-case-declarations */

import BasePlugin from '@appium/base-plugin';
import B from 'bluebird';


export default class FakePlugin extends BasePlugin {

  updatesServer = true;

  commands = ['getPageSource', 'findElement', 'getFakeSessionData', 'setFakeSessionData'];

  newMethodMap = {
    '/session/:sessionId/fake_data': {
      GET: {command: 'getFakeSessionData'},
      POST: {command: 'setFakeSessionData', payloadParams: {required: ['data']}}
    },
  };

  fakeRoute (req, res) {
    this.logger.debug('Sending fake route response');
    res.send(JSON.stringify({fake: 'fakeResponse'}));
  }

  async updateServer (expressApp/*, httpServer*/) { // eslint-disable-line require-await
    this.logger.debug('Updating server');
    expressApp.all('/fake', this.fakeRoute.bind(this));
  }

  async handle (next, driver, cmdName, ...args) {
    switch (cmdName) {
      case 'getPageSource':
        await B.delay(10);
        return `<Fake>${JSON.stringify(args)}</Fake>`;
      case 'findElement':
        this.logger.info(`Before the command ${cmdName} is run with args ${JSON.stringify(args)}`);
        const originalRes = await next();
        this.logger.info(`After the command ${cmdName} is run`);
        originalRes.fake = true;
        return originalRes;
      case 'getFakeSessionData':
        return driver.fakeSessionData || null;
      case 'setFakeSessionData':
        driver.fakeSessionData = args[0];
        return null;
      default:
        throw new Error(`Don't know how to handle command ${cmdName}`);
    }
  }
}
