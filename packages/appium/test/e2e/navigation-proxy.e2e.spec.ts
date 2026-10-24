import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer, request} from 'node:http';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {after, before, beforeEach, describe, it} from 'node:test';

import {routeConfiguringFunction, WebDriverProxy} from '@appium/base-driver';
import {BasePlugin} from '@appium/base-plugin';
import {FakeDriver} from '@appium/fake-driver';
import {server} from '@appium/http-server';
import type {AppiumServer, Element, NextPluginCallback, RouteMatcher} from '@appium/types';

import {AppiumDriver} from '../../lib/appium.js';

const HOST = '127.0.0.1';
const SESSION_ID = 'navigation';
const DOWNSTREAM_SESSION_ID = 'synthetic-browser';
const SYNTHETIC_ELEMENT: Element = {'element-6066-11e4-a52e-4f735466cecf': 'synthetic-element'};

type NavigationBody = Record<string, unknown>;
interface NavigationResponse {
  status: number;
  body: {value: null | Record<string, unknown>};
}

class NavigationDriver extends FakeDriver {
  readonly localUrls: unknown[] = [];
  readonly localFinds: [string, string][] = [];

  /** Records local dispatch without navigating or contacting an external service. */
  async setUrl(url: unknown): Promise<void> {
    this.localUrls.push(url);
  }

  /** Records local element lookup without querying a device or external service. */
  override findElement = async (strategy: string, selector: string): Promise<Element> => {
    this.localFinds.push([strategy, selector]);
    return SYNTHETIC_ELEMENT;
  };
}

class PassThroughNavigationPlugin extends BasePlugin {
  calls = 0;

  /** Lets the actual Appium plugin chain continue to its default proxy handler. */
  async setUrl(next: NextPluginCallback): Promise<unknown> {
    this.calls++;
    return await next();
  }

  /** Lets element lookup use the same pass-through plugin/default proxy chain. */
  async findElement(next: NextPluginCallback): Promise<unknown> {
    this.calls++;
    return await next();
  }
}

describe('Navigate To validation through the Appium proxy and plugin chain', function () {
  let downstream: Server;
  let appiumServer: AppiumServer;
  let appium: AppiumDriver;
  let driver: NavigationDriver;
  let proxy: WebDriverProxy;
  let upstreamPort: number;
  let windowOpen: boolean;
  let avoidNavigation: boolean;
  let avoidElementLookup: boolean;
  let plugin: PassThroughNavigationPlugin;
  let downstreamCalls: {method: string | undefined; path: string | undefined; body: NavigationBody}[];

  before(async function () {
    // This remote end is deliberately synthetic: it models command error ordering and
    // direct/plugin proxy parity, not a real browser or browser/WPT conformance.
    downstream = createServer((req, res) => {
      void (async () => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const body = JSON.parse(Buffer.concat(chunks).toString()) as NavigationBody;
        downstreamCalls.push({method: req.method, path: req.url, body});
        assert.equal(req.method, 'POST');
        const isNavigation = req.url === `/session/${DOWNSTREAM_SESSION_ID}/url`;
        assert.ok(isNavigation || req.url === `/session/${DOWNSTREAM_SESSION_ID}/element`);
        const validPayload = isNavigation
          ? typeof body.url === 'string' && URL.canParse(body.url)
          : typeof body.using === 'string' && typeof body.value === 'string';
        const error = !windowOpen ? 'no such window' : validPayload ? undefined : 'invalid argument';
        res.writeHead(error === 'no such window' ? 404 : error ? 400 : 200, {
          'content-type': 'application/json; charset=utf-8',
        });
        res.end(
          JSON.stringify({
            value: error
              ? {error, message: `Synthetic ${error}`, stacktrace: ''}
              : isNavigation
                ? null
                : SYNTHETIC_ELEMENT,
          }),
        );
      })().catch((error: Error) => {
        res.writeHead(500, {'content-type': 'application/json'});
        res.end(JSON.stringify({value: {error: 'unknown error', message: error.message, stacktrace: ''}}));
      });
    });
    downstream.listen(0, HOST);
    await once(downstream, 'listening');
    proxy = new WebDriverProxy({
      server: HOST,
      port: (downstream.address() as AddressInfo).port,
      sessionId: DOWNSTREAM_SESSION_ID,
      timeout: 3000,
      keepAlive: false,
    });
    driver = new NavigationDriver();
    driver.sessionId = SESSION_ID;
    driver.protocol = 'W3C';
    driver.newCommandTimeoutMs = 0;
    driver.proxyReqRes = proxy.proxyReqRes.bind(proxy);
    driver.proxyCommand = async <T = unknown>(...args: any[]): Promise<T> =>
      (await proxy.command(args[0], args[1], args[2])) as T;
    driver.getProxyAvoidList = () => {
      const routes: RouteMatcher[] = [];
      if (avoidNavigation) {
        routes.push(['POST', /\/url$/]);
      }
      if (avoidElementLookup) {
        routes.push(['POST', /\/element$/]);
      }
      return routes;
    };
    appium = new AppiumDriver({} as ConstructorParameters<typeof AppiumDriver>[0]);
    appium.sessions[SESSION_ID] = driver;
    appiumServer = await server({
      routeConfiguringFunction: routeConfiguringFunction(appium),
      port: 0,
      hostname: HOST,
    });
    upstreamPort = (appiumServer.address() as AddressInfo).port;
  });

  beforeEach(function () {
    downstreamCalls = [];
    windowOpen = true;
    avoidNavigation = false;
    avoidElementLookup = false;
    driver._proxyActive = true;
    driver.localUrls.length = 0;
    driver.localFinds.length = 0;
    plugin = new PassThroughNavigationPlugin('navigation-passthrough');
    appium.sessionPlugins[SESSION_ID] = [];
  });

  after(async function () {
    await driver?.clearNewCommandTimeout();
    proxy?.httpAgent.destroy();
    proxy?.httpsAgent.destroy();
    if (appiumServer) {
      appiumServer.closeAllConnections();
      await appiumServer.close();
    }
    if (downstream) {
      downstream.closeAllConnections();
      await new Promise<void>((resolve, reject) => downstream.close((error) => (error ? reject(error) : resolve())));
    }
  });

  async function navigate(body: unknown, sessionId = SESSION_ID): Promise<NavigationResponse> {
    return await postCommand('url', body, sessionId);
  }

  async function findElement(body: unknown): Promise<NavigationResponse> {
    return await postCommand('element', body);
  }

  async function postCommand(path: string, body: unknown, sessionId = SESSION_ID): Promise<NavigationResponse> {
    const payload = JSON.stringify(body);
    return await new Promise((resolve, reject) => {
      const req = request(
        {
          hostname: HOST,
          port: upstreamPort,
          path: `/session/${sessionId}/${path}`,
          method: 'POST',
          agent: false,
          headers: {'content-type': 'application/json', 'content-length': Buffer.byteLength(payload)},
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('error', reject);
          res.on('end', () => {
            try {
              resolve({status: res.statusCode ?? 0, body: JSON.parse(Buffer.concat(chunks).toString())});
            } catch (error) {
              reject(error);
            }
          });
        },
      );
      req.on('error', reject);
      req.setTimeout(5000, () => req.destroy(new Error('Synthetic command request timed out')));
      req.end(payload);
    });
  }

  const invalidBodies: [string, NavigationBody][] = [
    ['relative URL', {url: 'example.com'}],
    ['empty URL', {url: ''}],
    ['numeric URL', {url: 42}],
    ['null URL', {url: null}],
    ['object URL', {url: {}}],
    ['array URL', {url: []}],
    ['object with a non-callable toString', {url: {toString: null}}],
    ['missing URL', {}],
  ];

  for (const withPlugin of [false, true]) {
    describe(withPlugin ? 'with a pass-through plugin' : 'without a plugin', function () {
      beforeEach(function () {
        appium.sessionPlugins[SESSION_ID] = withPlugin ? [plugin] : [];
      });

      for (const [name, body] of invalidBodies) {
        for (const open of [true, false]) {
          it(`forwards a ${name} and preserves ${open ? 'invalid argument' : 'no such window'} from downstream`, async function () {
            windowOpen = open;
            const result = await navigate(body);
            assert.equal(result.status, open ? 400 : 404);
            assert.equal(result.body.value?.error, open ? 'invalid argument' : 'no such window');
            assert.deepStrictEqual(downstreamCalls, [
              {method: 'POST', path: `/session/${DOWNSTREAM_SESSION_ID}/url`, body},
            ]);
            assert.equal(plugin.calls, withPlugin ? 1 : 0);
            assert.deepStrictEqual(driver.localUrls, []);
          });
        }
      }

      for (const url of [
        'https://example.test/path#part',
        'about:blank',
        'data:text/plain,hello',
        'ftp://example.test',
      ]) {
        it(`forwards the valid URL ${url} unchanged`, async function () {
          const result = await navigate({url});
          assert.equal(result.status, 200);
          assert.equal(result.body.value, null);
          assert.deepStrictEqual(downstreamCalls, [
            {method: 'POST', path: `/session/${DOWNSTREAM_SESSION_ID}/url`, body: {url}},
          ]);
          assert.equal(plugin.calls, withPlugin ? 1 : 0);
        });
      }
    });
  }

  for (const mode of ['proxy inactive', 'proxy avoidance'] as const) {
    for (const [name, body] of invalidBodies) {
      it(`retains local 400 validation for ${name} when ${mode}`, async function () {
        appium.sessionPlugins[SESSION_ID] = [plugin];
        driver._proxyActive = mode !== 'proxy inactive';
        avoidNavigation = mode === 'proxy avoidance';
        const result = await navigate(body);
        assert.equal(result.status, 400);
        assert.equal(result.body.value?.error, 'invalid argument');
        assert.deepStrictEqual(downstreamCalls, []);
        assert.deepStrictEqual(driver.localUrls, []);
        assert.equal(plugin.calls, 0);
      });
    }

    it(`retains valid local dispatch when ${mode}`, async function () {
      appium.sessionPlugins[SESSION_ID] = [plugin];
      driver._proxyActive = mode !== 'proxy inactive';
      avoidNavigation = mode === 'proxy avoidance';
      const url = 'about:blank';
      const result = await navigate({url});
      assert.equal(result.status, 200);
      assert.equal(result.body.value, null);
      assert.deepStrictEqual(driver.localUrls, [url]);
      assert.deepStrictEqual(downstreamCalls, []);
      assert.equal(plugin.calls, 1);
    });
  }

  it('retains the session-existence check before plugin or downstream handling', async function () {
    appium.sessionPlugins[SESSION_ID] = [plugin];
    const result = await navigate({url: 'example.com'}, 'missing-session');
    assert.equal(result.status, 404);
    assert.equal(result.body.value?.error, 'invalid session id');
    assert.deepStrictEqual(downstreamCalls, []);
    assert.equal(plugin.calls, 0);
  });

  it('retains the JSON-object body check before plugin or downstream handling', async function () {
    appium.sessionPlugins[SESSION_ID] = [plugin];
    windowOpen = false;
    const result = await navigate([]);
    assert.equal(result.status, 400);
    assert.equal(result.body.value?.error, 'invalid argument');
    assert.deepStrictEqual(downstreamCalls, []);
    assert.equal(plugin.calls, 0);
  });

  describe('Find Element required-parameter validation', function () {
    const missingLocatorBodies: [string, NavigationBody][] = [
      ['missing using', {value: '#example'}],
      ['missing value', {using: 'css selector'}],
      ['missing both locator fields', {}],
    ];

    for (const withPlugin of [false, true]) {
      for (const [name, body] of missingLocatorBodies) {
        for (const open of [true, false]) {
          it(`forwards ${name} ${withPlugin ? 'with' : 'without'} a plugin and preserves ${open ? 'invalid argument' : 'no such window'}`, async function () {
            appium.sessionPlugins[SESSION_ID] = withPlugin ? [plugin] : [];
            windowOpen = open;
            const result = await findElement(body);
            assert.equal(result.status, open ? 400 : 404);
            assert.equal(result.body.value?.error, open ? 'invalid argument' : 'no such window');
            assert.equal(result.body.value?.message, `Synthetic ${open ? 'invalid argument' : 'no such window'}`);
            assert.deepStrictEqual(downstreamCalls, [
              {method: 'POST', path: `/session/${DOWNSTREAM_SESSION_ID}/element`, body},
            ]);
            assert.equal(plugin.calls, withPlugin ? 1 : 0);
            assert.deepStrictEqual(driver.localFinds, []);
          });
        }
      }

      it(`forwards a valid locator unchanged ${withPlugin ? 'with' : 'without'} a plugin`, async function () {
        appium.sessionPlugins[SESSION_ID] = withPlugin ? [plugin] : [];
        const body = {using: 'css selector', value: '#example'};
        const result = await findElement(body);
        assert.equal(result.status, 200);
        assert.deepStrictEqual(result.body.value, SYNTHETIC_ELEMENT);
        assert.deepStrictEqual(downstreamCalls, [
          {method: 'POST', path: `/session/${DOWNSTREAM_SESSION_ID}/element`, body},
        ]);
        assert.equal(plugin.calls, withPlugin ? 1 : 0);
        assert.deepStrictEqual(driver.localFinds, []);
      });
    }

    for (const mode of ['proxy inactive', 'proxy avoidance'] as const) {
      for (const [name, body] of missingLocatorBodies) {
        it(`retains local 400 validation for ${name} when ${mode}`, async function () {
          appium.sessionPlugins[SESSION_ID] = [plugin];
          driver._proxyActive = mode !== 'proxy inactive';
          avoidElementLookup = mode === 'proxy avoidance';
          const result = await findElement(body);
          assert.equal(result.status, 400);
          assert.equal(result.body.value?.error, 'invalid argument');
          assert.deepStrictEqual(downstreamCalls, []);
          assert.deepStrictEqual(driver.localFinds, []);
          assert.equal(plugin.calls, 0);
        });
      }

      it(`retains valid local element lookup when ${mode}`, async function () {
        appium.sessionPlugins[SESSION_ID] = [plugin];
        driver._proxyActive = mode !== 'proxy inactive';
        avoidElementLookup = mode === 'proxy avoidance';
        const body = {using: 'css selector', value: '#example'};
        const result = await findElement(body);
        assert.equal(result.status, 200);
        assert.deepStrictEqual(result.body.value, SYNTHETIC_ELEMENT);
        assert.deepStrictEqual(driver.localFinds, [[body.using, body.value]]);
        assert.deepStrictEqual(downstreamCalls, []);
        assert.equal(plugin.calls, 1);
      });
    }
  });
});
