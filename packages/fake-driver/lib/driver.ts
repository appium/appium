import B from 'bluebird';
import type {Request, Response} from 'express';
import {BaseDriver, errors} from 'appium/driver';
import type {DriverData} from '@appium/types';
import {desiredCapConstraints} from './desired-caps';
import type {FakeDriverConstraints} from './desired-caps';
import type {FakeDriverCaps, W3CFakeDriverCaps} from './types';
import {FakeApp} from './fake-app';
import type {FakeElement} from './fake-element';

export type {FakeDriverConstraints};
export type {Orientation} from '@appium/types';

/**
 * @template [Thing=any]
 */
export class FakeDriver<Thing = unknown> extends BaseDriver<FakeDriverConstraints> {
  readonly desiredCapConstraints = desiredCapConstraints;

  curContext: string;
  appModel: FakeApp;
  _proxyActive: boolean;
  shook: boolean;
  focusedElId: string | null;
  fakeThing: Thing | null;
  maxElId: number;
  elMap: Record<string, FakeElement>;
  _bidiProxyUrl: string | null;
  _clockRunning = false;

  constructor(
    opts: import('@appium/types').InitialOpts = {} as import('@appium/types').InitialOpts,
    shouldValidateCaps = true
  ) {
    super(opts, shouldValidateCaps);
    this.curContext = 'NATIVE_APP';
    this.elMap = {};
    this.focusedElId = null;
    this.maxElId = 0;
    this.fakeThing = null;
    this._proxyActive = false;
    this.shook = false;
    this.appModel = new FakeApp();
    this._bidiProxyUrl = null;
  }

  proxyActive(): boolean {
    return this._proxyActive;
  }

  canProxy(): boolean {
    return true;
  }

  get bidiProxyUrl(): string | null {
    return this._bidiProxyUrl;
  }

  proxyReqRes(req: Request, res: Response): void {
    res.set('content-type', 'application/json');
    const resBodyObj: {value: string; sessionId: string | null} = {
      value: 'proxied via proxyReqRes',
      sessionId: null,
    };
    const match = req.originalUrl.match(/\/session\/([^/]+)/);
    resBodyObj.sessionId = match ? match[1] : null;
    res.status(200).send(JSON.stringify(resBodyObj));
  }

  async proxyCommand<T = unknown>(): Promise<T> {
    return 'proxied via proxyCommand' as T;
  }

  /**
   * Comment for `createSession` in `FakeDriver`
   */
  override async createSession(
    w3cCapabilities1: W3CFakeDriverCaps,
    w3cCapabilities2?: W3CFakeDriverCaps,
    w3cCapabilities3?: W3CFakeDriverCaps,
    driverData: DriverData[] = []
  ): Promise<[string, FakeDriverCaps]> {
    for (const d of driverData) {
      if (d.isUnique) {
        throw new errors.SessionNotCreatedError(
          'Cannot start session; another ' +
            'unique session is in progress that requires all resources'
        );
      }
    }

    const [sessionId, caps] = await super.createSession(
      w3cCapabilities1,
      w3cCapabilities2,
      w3cCapabilities3,
      driverData
    ) as [string, FakeDriverCaps];
    this.caps = caps;
    await this.appModel.loadApp(caps.app);
    if (this.caps.runClock) {
      this.startClock();
    }
    return [sessionId, caps];
  }

  async deleteSession(sessionId?: string): Promise<void> {
    this.stopClock();
    return await super.deleteSession(sessionId);
  }

  async getWindowHandle(): Promise<string> {
    return '1';
  }

  async getWindowHandles(): Promise<string[]> {
    return ['1'];
  }

  get driverData(): {isUnique: boolean} {
    return {
      isUnique: !!this.caps.uniqueApp,
    };
  }

  async getFakeThing(): Promise<Thing | null> {
    await B.delay(1);
    return this.fakeThing;
  }

  async startClock(): Promise<void> {
    this._clockRunning = true;
    while (this._clockRunning) {
      await B.delay(500);
      this.eventEmitter.emit('bidiEvent', {
        method: 'appium:clock.currentTime',
        params: {time: Date.now()},
      });
    }
  }

  stopClock(): void {
    this._clockRunning = false;
  }

  async setFakeThing(thing: Thing): Promise<null> {
    await B.delay(1);
    this.fakeThing = thing;
    return null;
  }

  async getFakeDriverArgs(): Promise<typeof this.cliArgs> {
    await B.delay(1);
    return this.cliArgs;
  }

  async getDeprecatedCommandsCalled(): Promise<string[]> {
    await B.delay(1);
    return [];
  }

  async callDeprecatedCommand(): Promise<void> {
    await B.delay(1);
  }

  async doSomeMath(num1: number, num2: number): Promise<number> {
    await B.delay(1);
    return num1 + num2;
  }

  async doSomeMath2(num1: number, num2: number): Promise<number> {
    await B.delay(1);
    return num1 + num2;
  }

  static newBidiCommands = {
    'appium:fake': {
      getFakeThing: {
        command: 'getFakeThing',
      },
      setFakeThing: {
        command: 'setFakeThing',
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
  } as const;

  static newMethodMap = {
    '/session/:sessionId/fakedriver': {
      GET: {command: 'getFakeThing'},
      POST: {command: 'setFakeThing', payloadParams: {required: ['thing'] as const}},
    },
    '/session/:sessionId/fakedriverargs': {
      GET: {command: 'getFakeDriverArgs'},
    },
    '/session/:sessionId/deprecated': {
      POST: {command: 'callDeprecatedCommand', deprecated: true},
    },
    '/session/:sessionId/doubleclick': {
      POST: {command: 'doubleClick'},
    },
  } as const;

  static executeMethodMap = {
    'fake: addition': {
      command: 'fakeAddition',
      params: {required: ['num1', 'num2'], optional: ['num3']},
    },
    'fake: getThing': {
      command: 'getFakeThing',
    },
    'fake: setThing': {
      command: 'setFakeThing',
      params: {required: ['thing']},
    },
    'fake: getDeprecatedCommandsCalled': {
      command: 'getDeprecatedCommandsCalled',
    },
  } as const;

  static fakeRoute(req: Request, res: Response): void {
    res.send(JSON.stringify({fakedriver: 'fakeResponse'}));
  }

  static async updateServer(
    expressApp: import('express').Express,
    httpServer: import('http').Server,
    cliArgs: Record<string, unknown>
  ): Promise<void> {
    expressApp.all('/fakedriver', FakeDriver.fakeRoute);
    expressApp.all('/fakedriverCliArgs', (req: Request, res: Response) => {
      res.send(JSON.stringify(cliArgs));
    });
  }
}

import './commands';

export default FakeDriver;
