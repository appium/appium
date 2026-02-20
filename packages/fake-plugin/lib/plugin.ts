import {BasePlugin} from 'appium/plugin';
import {sleep} from 'asyncbox';
import type {Request, Response, Application} from 'express';
import type {
  AppiumServer,
  BidiModuleMap,
  ExecuteMethodMap,
  ExternalDriver,
  MethodMap,
} from '@appium/types';

/** Driver as seen by this plugin; may include plugin-specific session data */
export type DriverLike = ExternalDriver & {fakeSessionData?: unknown};

export class FakePlugin extends BasePlugin {
  private readonly fakeThing: string;
  private pluginThing: unknown = null;
  protected _clockRunning: boolean = true;
  private static _unexpectedData: string | null = null;

  static newMethodMap: MethodMap<FakePlugin> = {
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

  static newBidiCommands: BidiModuleMap = {
    'appium:fake': {
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
    },
  };

  static executeMethodMap: ExecuteMethodMap<FakePlugin> = {
    'fake: getThing': {
      command: 'getFakeThing',
    },
    'fake: plugMeIn': {
      command: 'plugMeIn',
      params: {required: ['socket']},
    },
  };

  constructor(name: string, cliArgs: Record<string, unknown> = {}) {
    super(name, cliArgs);
    this.fakeThing = 'PLUGIN_FAKE_THING';
    this.startClock();
  }

  static fakeRoute(_req: Request, res: Response): void {
    res.send(JSON.stringify({fake: 'fakeResponse'}));
  }

  static unexpectedData(_req: Request, res: Response): void {
    res.send(JSON.stringify(FakePlugin._unexpectedData));
    FakePlugin._unexpectedData = null;
  }

  static async updateServer(
    expressApp: Application,
    _httpServer: AppiumServer,
    cliArgs: Record<string, unknown>
  ): Promise<void> {
    expressApp.all('/fake', FakePlugin.fakeRoute);
    expressApp.all('/unexpected', FakePlugin.unexpectedData);
    expressApp.all('/cliArgs', (req, res) => {
      res.send(JSON.stringify(cliArgs));
    });
  }

  async startClock(): Promise<void> {
    while (this._clockRunning) {
      await sleep(250);
      this.eventEmitter.emit('bidiEvent', {
        method: 'appium:clock.currentTime',
        params: {time: Date.now()},
      });
    }
  }

  async doSomeMath(
    next: () => Promise<number>,
    _driver: DriverLike,
    num1: number,
    num2: number
  ): Promise<number> {
    const sum = await next();
    return num1 * num2 + sum;
  }

  async doSomeMath2(
    _next: () => Promise<unknown>,
    _driver: DriverLike,
    num1: number,
    num2: number
  ): Promise<number> {
    await sleep(1);
    return num1 * num2;
  }

  async getFakeThing(): Promise<string> {
    await sleep(1);
    return this.fakeThing;
  }

  async getPluginThing(): Promise<unknown> {
    this.eventEmitter.emit('bidiEvent', {
      method: 'appium:fake.pluginThingRetrieved',
      params: {},
    });
    return this.pluginThing;
  }

  async setPluginThing(
    _next: () => Promise<unknown>,
    _driver: DriverLike,
    thing: unknown
  ): Promise<void> {
    this.pluginThing = thing;
  }

  async plugMeIn(
    _next: () => Promise<unknown>,
    _driver: DriverLike,
    socket: string
  ): Promise<string> {
    await sleep(1);
    return `Plugged in to ${socket}`;
  }

  async getFakePluginArgs(): Promise<Record<string, unknown>> {
    await sleep(1);
    return this.cliArgs;
  }

  async getPageSource(
    _next: () => Promise<string>,
    _driver: DriverLike,
    ...args: unknown[]
  ): Promise<string> {
    await sleep(10);
    return `<Fake>${JSON.stringify(args)}</Fake>`;
  }

  async findElement(
    next: () => Promise<{fake?: boolean} & Record<string, unknown>>,
    _driver: DriverLike,
    ...args: unknown[]
  ): Promise<{fake?: boolean} & Record<string, unknown>> {
    this.log.info(`Before findElement is run with args ${JSON.stringify(args)}`);
    const originalRes = await next();
    this.log.info('After findElement is run');
    originalRes.fake = true;
    return originalRes;
  }

  async getFakeSessionData(_next: () => Promise<unknown>, driver: DriverLike): Promise<unknown> {
    await sleep(1);
    return driver.fakeSessionData ?? null;
  }

  async setFakeSessionData(
    _next: () => Promise<unknown>,
    driver: DriverLike,
    ...args: unknown[]
  ): Promise<null> {
    await sleep(1);
    driver.fakeSessionData = args[0];
    return null;
  }

  async getWindowHandle(next: () => Promise<string>): Promise<string> {
    const handle = await next();
    return `<<${handle}>>`;
  }

  async onUnexpectedShutdown(_driver: DriverLike, cause: Error | string): Promise<void> {
    this._clockRunning = false;
    FakePlugin._unexpectedData = `Session ended because ${cause}`;
  }

  async execute(
    next: () => Promise<unknown>,
    driver: DriverLike,
    script: string,
    args: unknown[]
  ): Promise<unknown> {
    return await this.executeMethod(next, driver as any, script, args);
  }

  async deleteSession(next: () => Promise<unknown>): Promise<unknown> {
    this._clockRunning = false;
    return await next();
  }
}
