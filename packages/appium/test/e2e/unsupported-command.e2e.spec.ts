import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {after, before, beforeEach, describe, it} from 'node:test';

import {routeConfiguringFunction, WebDriverProxy} from '@appium/base-driver';
import {BasePlugin} from '@appium/base-plugin';
import {httpGet, httpPost} from '@appium/driver-test-support';
import {FakeDriver} from '@appium/fake-driver';
import {server} from '@appium/http-server';
import type {AppiumServer, NextPluginCallback} from '@appium/types';

import {AppiumDriver} from '../../lib/appium.js';

const HOST = '127.0.0.1';
const SESSION_ID = 'unsupported-command';
const DOWNSTREAM_SESSION_ID = 'synthetic-remote';

class PrintPlugin extends BasePlugin {
  calls = 0;
  handlesPrint = false;

  /** Either supplies the missing command or continues through Appium's proxy chain. */
  async printPage(next: NextPluginCallback): Promise<unknown> {
    this.calls++;
    return this.handlesPrint ? 'plugin-document' : await next();
  }
}

describe('Missing standard command handlers through Appium HTTP dispatch', function () {
  let downstream: Server;
  let appiumServer: AppiumServer;
  let appium: AppiumDriver;
  let driver: FakeDriver;
  let proxy: WebDriverProxy;
  let baseUrl: string;
  let plugin: PrintPlugin;
  let downstreamCalls: {method: string | undefined; path: string | undefined; body: unknown}[];

  before(async function () {
    // A loopback remote end tests error ownership; it does not implement browser printing.
    downstream = createServer((req, res) => {
      void (async () => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        downstreamCalls.push({
          method: req.method,
          path: req.url,
          body: JSON.parse(Buffer.concat(chunks).toString()),
        });
        res.writeHead(404, {'content-type': 'application/json'});
        res.end(JSON.stringify({value: {error: 'no such window', message: 'Synthetic closed window', stacktrace: ''}}));
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
    driver = new FakeDriver();
    driver.sessionId = SESSION_ID;
    driver.protocol = 'W3C';
    driver.newCommandTimeoutMs = 0;
    driver.proxyReqRes = proxy.proxyReqRes.bind(proxy);
    driver.proxyCommand = async <T = unknown>(...args: any[]): Promise<T> =>
      (await proxy.command(args[0], args[1], args[2])) as T;
    appium = new AppiumDriver({} as ConstructorParameters<typeof AppiumDriver>[0]);
    appium.sessions[SESSION_ID] = driver;
    appiumServer = await server({
      routeConfiguringFunction: routeConfiguringFunction(appium),
      port: 0,
      hostname: HOST,
    });
    baseUrl = `http://${HOST}:${(appiumServer.address() as AddressInfo).port}`;
  });

  beforeEach(function () {
    driver._proxyActive = false;
    downstreamCalls = [];
    plugin = new PrintPlugin('print-test');
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

  it('returns unsupported operation for a valid request with no local print handler', async function () {
    const {status, data} = await httpPost(`${baseUrl}/session/${SESSION_ID}/print`, {}, {throwOnError: false});
    assert.equal(status, 500);
    assert.equal(data.value.error, 'unsupported operation');
    assert.deepEqual(downstreamCalls, []);
  });

  it('retains dispatch to an implemented standard command', async function () {
    const {status, data} = await httpGet(`${baseUrl}/session/${SESSION_ID}/window`);
    assert.equal(status, 200);
    assert.equal(data.value, '1');
  });

  it('retains unknown method for the wrong verb on a known standard URL', async function () {
    const {status, data} = await httpGet(`${baseUrl}/session/${SESSION_ID}/print`, {throwOnError: false});
    assert.equal(status, 405);
    assert.equal(data.value.error, 'unknown method');
  });

  it('retains unknown command for an unknown URL', async function () {
    const {status, data} = await httpGet(`${baseUrl}/session/${SESSION_ID}/unknown-command`, {throwOnError: false});
    assert.equal(status, 404);
    assert.equal(data.value.error, 'unknown command');
  });

  it('allows a plugin to supply the missing standard command', async function () {
    plugin.handlesPrint = true;
    appium.sessionPlugins[SESSION_ID] = [plugin];
    const {status, data} = await httpPost(`${baseUrl}/session/${SESSION_ID}/print`, {});
    assert.equal(status, 200);
    assert.equal(data.value, 'plugin-document');
    assert.equal(plugin.calls, 1);
    assert.deepEqual(downstreamCalls, []);
  });

  for (const withPlugin of [false, true]) {
    it(`preserves the downstream error ${withPlugin ? 'through a pass-through plugin' : 'with direct proxying'}`, async function () {
      driver._proxyActive = true;
      appium.sessionPlugins[SESSION_ID] = withPlugin ? [plugin] : [];
      const {status, data} = await httpPost(`${baseUrl}/session/${SESSION_ID}/print`, {}, {throwOnError: false});
      assert.equal(status, 404);
      assert.equal(data.value.error, 'no such window');
      assert.equal(data.value.message, 'Synthetic closed window');
      assert.equal(plugin.calls, withPlugin ? 1 : 0);
      assert.deepEqual(downstreamCalls, [{method: 'POST', path: `/session/${DOWNSTREAM_SESSION_ID}/print`, body: {}}]);
    });
  }
});
