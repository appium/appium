import type {Constraints, RouteMatcher} from '@appium/types';
import {errors, BaseDriver, determineProtocol} from '../../../lib';
import {PROTOCOLS} from '../../../lib/constants';
import {util} from '@appium/support';

class FakeDriver extends BaseDriver<Constraints> {
  static newMethodMap = {
    '/session/:sessionId/noproxy': {
      GET: {command: 'notProxiedCommand', neverProxy: true},
    },
  };

  declare jwpProxyActive: boolean;

  constructor() {
    super({} as any);
    this.protocol = PROTOCOLS.MJSONWP;
    this.sessionId = null;
    this.jwpProxyActive = false;
  }

  sessionExists(sessionId?: string | null): boolean {
    if (!sessionId) {
      return false;
    }
    return sessionId === this.sessionId;
  }

  driverForSession(_sessionId: string): FakeDriver | null { // eslint-disable-line @typescript-eslint/no-unused-vars
    return this;
  }

  async createSession(
    desiredCapabilities: any,
    requiredCapabilities: any,
    capabilities: any
  ): Promise<[string, any]> {
    this.sessionId = `fakeSession_${util.uuidV4()}`;
    return [this.sessionId, capabilities];
  }

  async executeCommand(cmd: string, ...args: any[]): Promise<any> {
    if (!(this as any)[cmd]) {
      throw new errors.NotYetImplementedError();
    }
    if (cmd === 'createSession') {
      this.protocol = determineProtocol(args);
    }
    return await (this as any)[cmd](...args);
  }

  async deleteSession(): Promise<void> {
    this.jwpProxyActive = false;
    this.sessionId = null;
  }

  async getStatus(): Promise<string> {
    return "I'm fine";
  }

  async setUrl(url: string): Promise<string> {
    return `Navigated to: ${url}`;
  }

  async getUrl(): Promise<string> {
    return 'http://foobar.com';
  }

  async back(sessionId: string): Promise<string> {
    return sessionId;
  }

  async forward(): Promise<void> {}

  async refresh(): Promise<void> {
    throw new Error('Too Fresh!');
  }

  async getSession(): Promise<any> {
    throw new errors.NoSuchDriverError();
  }

  async click(elementId: string, sessionId: string): Promise<any[]> {
    return [elementId, sessionId];
  }

  async implicitWait(ms: number): Promise<number> {
    return ms;
  }

  async setNetworkConnection(type: number): Promise<number> {
    return type;
  }

  async moveTo(element: string | null, xOffset: number, yOffset: number): Promise<any[]> {
    return [element, xOffset, yOffset];
  }

  async getText(): Promise<string> {
    return '';
  }

  async getAttribute(attr: string, elementId: string, sessionId: string): Promise<any[]> {
    return [attr, elementId, sessionId];
  }

  async setValue(value: string | string[], elementId: string): Promise<any[]> {
    return [value, elementId];
  }

  async performTouch(...args: any[]): Promise<any> {
    return args;
  }

  async setFrame(frameId: string): Promise<string> {
    return frameId;
  }

  async removeApp(app: string): Promise<string> {
    return app;
  }

  async getSettings(): Promise<{status: number; value: string}> {
    return {status: 13, value: 'Mishandled Driver Error'};
  }

  proxyActive(_sessionId?: string): boolean { // eslint-disable-line @typescript-eslint/no-unused-vars
    return false;
  }

  getProxyAvoidList(_sessionId: string): RouteMatcher[] { // eslint-disable-line @typescript-eslint/no-unused-vars
    return [];
  }

  canProxy(_sessionId?: string): boolean { // eslint-disable-line @typescript-eslint/no-unused-vars
    return false;
  }

  async notProxiedCommand(): Promise<string> {
    return 'This was not proxied';
  }
}

export {FakeDriver};
