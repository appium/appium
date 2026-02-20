import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import _ from 'lodash';
import {server, routeConfiguringFunction, DEFAULT_WS_PATHNAME_PREFIX} from '../../../lib';
import {FakeDriver} from '../protocol/fake-driver';
import WebSocket from 'ws';
import {TEST_HOST, getTestPort} from '@appium/driver-test-support';

chai.use(chaiAsPromised);

describe('Websockets (e2e)', function () {
  let baseServer: Awaited<ReturnType<typeof server>>;
  let driver: FakeDriver;
  let port: number;
  const SESSION_ID = 'foo';
  const WS_DATA = 'Hello';

  before(async function () {
    driver = new FakeDriver();
    driver.sessionId = SESSION_ID;
    port = await getTestPort();
    baseServer = await server({
      routeConfiguringFunction: routeConfiguringFunction(driver),
      port,
    });
  });

  after(async function () {
    await baseServer.close();
  });

  describe('web sockets support', function () {
    it('should be able to add websocket handler and remove it', async function () {
      const wss = new WebSocket.Server({
        noServer: true,
      });
      wss.on('connection', (ws) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(WS_DATA);
        }
      });
      const endpoint = `${DEFAULT_WS_PATHNAME_PREFIX}/hello`;
      const timeout = 5000;
      await baseServer.addWebSocketHandler(endpoint, wss);
      expect(_.keys(await baseServer.getWebSocketHandlers()).length).to.eql(1);
      await new Promise<void>((resolve, reject) => {
        const client = new WebSocket(`ws://${TEST_HOST}:${port}${endpoint}`);
        client.once('upgrade', (res) => {
          try {
            expect(res.statusCode).to.eql(101);
          } catch (e) {
            reject(e);
          }
        });
        client.once('message', (data) => {
          const dataStr = _.isString(data) ? data : data.toString();
          expect(dataStr).to.eql(WS_DATA);
          resolve();
        });
        client.once('error', reject);
        setTimeout(
          () => reject(new Error('No websocket messages have been received after the timeout')),
          timeout
        );
      });

      expect(await baseServer.removeWebSocketHandler(endpoint)).to.be.true;
      expect(_.keys(await baseServer.getWebSocketHandlers()).length).to.eql(0);
      await new Promise((resolve, reject) => {
        const client = new WebSocket(`ws://${TEST_HOST}:${port}${endpoint}`);
        client.on('message', (data) =>
          reject(
            new Error(
              `No websocket messages are expected after the handler ` +
                `has been removed. '${data}' is received instead. `
            )
          )
        );
        client.on('error', resolve);
        setTimeout(resolve, timeout);
      });
    });
  });
});
