// @ts-check


import {BasePlugin} from 'appium/plugin';
import B from 'bluebird';

class FakePlugin extends BasePlugin {
  /**
   * @type {string}
   * @readonly
   */
  fakeThing;

  /**
   * @type {any}
   */
  pluginThing = null;

  _clockRunning = true;

  /**
   * @param {string} name
   * @param {Record<string,unknown>} cliArgs
   */
  constructor(name, cliArgs) {
    super(name, cliArgs);
    this.fakeThing = 'PLUGIN_FAKE_THING';
    this.startClock();
  }

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

  static newBidiCommands = /** @type {const} */({
    fake: {
      getPluginThing: {
        command: 'getPluginThing',
      },
      setPluginThing: {
        command: 'setPluginThing',
        params: {
          required: ['thing'],
        },
      },
      doSomeMath: {
        command: 'doSomeMath',
        params: {
          required: ['num1', 'num2'],
        },
      },
      doSomeMath2: {
        command: 'doSomeMath2',
        params: {
          required: ['num1', 'num2'],
        },
      },
    }
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

  static fakeRoute(req, res) {
    res.send(JSON.stringify({fake: 'fakeResponse'}));
  }

  static unexpectedData(req, res) {
    res.send(JSON.stringify(FakePlugin._unexpectedData));
    FakePlugin._unexpectedData = null;
  }


  static async updateServer(expressApp, httpServer, cliArgs) {
    expressApp.all('/fake', FakePlugin.fakeRoute);
    expressApp.all('/unexpected', FakePlugin.unexpectedData);
    expressApp.all('/cliArgs', (req, res) => {
      res.send(JSON.stringify(cliArgs));
    });
  }

  async startClock() {
    while (this._clockRunning) {
      await B.delay(250);
      this.eventEmitter.emit('bidiEvent', {
        method: 'clock.currentTime',
        params: {time: Date.now()},
      });
    }
  }

  async doSomeMath(next, driver, num1, num2) {
    const sum = await next(); // call driver's 'doSomeMath' which sums num1 and num2
    return (num1 * num2) + sum;
  }

  async doSomeMath2(next, driver, num1, num2) {
    // ignore next & driver in this method
    await B.delay(1);
    return num1 * num2;
  }

  async getFakeThing() {
    await B.delay(1);
    return this.fakeThing;
  }

  /**
   * @param {() => Promise<any>} next
   * @param {import('@appium/types').Driver} driver
   */
  async getPluginThing(next, driver) {
    this.eventEmitter.emit('bidiEvent', {
      method: 'fake.pluginThingRetrieved',
      params: {},
    });
    return this.pluginThing;
  }

  /**
   * @param {() => Promise<any>} next
   * @param {import('@appium/types').Driver} driver
   * @param {any} thing
   */
  async setPluginThing(next, driver, thing) {
    this.pluginThing = thing;
  }

  async plugMeIn(next, driver, /** @type {string} */ socket) {
    await B.delay(1);
    return `Plugged in to ${socket}`;
  }

  async getFakePluginArgs() {
    await B.delay(1);
    return this.cliArgs;
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


  async onUnexpectedShutdown(driver, cause) {
    this._clockRunning = false;
    FakePlugin._unexpectedData = `Session ended because ${cause}`;
  }

  async execute(next, driver, script, args) {
    return await this.executeMethod(next, driver, script, args);
  }

  async deleteSession(next) {
    this._clockRunning = false;
    return await next();
  }
}

export {FakePlugin};
export default FakePlugin;
