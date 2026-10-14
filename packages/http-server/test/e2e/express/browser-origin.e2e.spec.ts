import assert from 'node:assert/strict';
import http from 'node:http';
import {after, before, describe, it} from 'node:test';

import {getTestPort, TEST_HOST} from '@appium/driver-test-support';
import type {AppiumServer} from '@appium/types';
import axios from 'axios';
import express from 'express';
import type {Express} from 'express';
import WebSocket, {WebSocketServer} from 'ws';

import {configureServer, server} from '../../../lib/server.js';

const EVIL_ORIGIN = 'https://evil.example';
const WS_PATH = '/ws/test';

function addTestRoutes(app: Express): void {
  app.get('/ping', (_req, res) => void res.json({ok: true}));
  app.post('/ping', (_req, res) => void res.json({ok: true}));
}

function newWsServer(): WebSocketServer {
  return new WebSocketServer({noServer: true});
}

/** Resolves with `open` or the HTTP status that the upgrade was rejected with */
async function connect(port: number, origin?: string): Promise<'open' | number> {
  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${TEST_HOST}:${port}${WS_PATH}`, origin ? {origin} : {});
    let opened = false;
    ws.once('open', () => {
      opened = true;
      ws.close();
    });
    ws.once('close', () => opened && resolve('open'));
    ws.once('unexpected-response', (_req, res) => {
      res.resume();
      resolve(res.statusCode as number);
    });
    ws.once('error', reject);
  });
}

async function post(port: number, origin?: string): Promise<number> {
  const {status} = await axios.post(
    `http://${TEST_HOST}:${port}/ping`,
    {},
    {
      headers: origin ? {origin} : {},
      validateStatus: () => true,
    },
  );
  return status;
}

async function get(port: number, origin?: string): Promise<number> {
  const {status} = await axios.get(`http://${TEST_HOST}:${port}/ping`, {
    headers: origin ? {origin} : {},
    validateStatus: () => true,
  });
  return status;
}

describe('browser origin protection', function () {
  describe('server without an explicit allowCors', function () {
    let appiumServer: AppiumServer;
    let port: number;

    before(async function () {
      port = await getTestPort();
      appiumServer = await server({routeConfiguringFunction: addTestRoutes, port});
    });

    after(async function () {
      await appiumServer.close();
    });

    it('should reject a POST with an Origin header by default', async function () {
      assert.equal(await post(port, EVIL_ORIGIN), 403);
    });
  });

  for (const allowCors of [false, true]) {
    describe(`server with allowCors=${allowCors}`, function () {
      let appiumServer: AppiumServer;
      let port: number;

      before(async function () {
        port = await getTestPort();
        appiumServer = await server({routeConfiguringFunction: addTestRoutes, port, allowCors});
        const wss = newWsServer();
        wss.on('connection', () => {});
        await appiumServer.addWebSocketHandler(WS_PATH, wss);
      });

      after(async function () {
        await appiumServer.removeAllWebSocketHandlers();
        await appiumServer.close();
      });

      it('should always accept requests without an Origin header', async function () {
        assert.equal(await post(port), 200);
        assert.equal(await get(port), 200);
        assert.equal(await connect(port), 'open');
      });

      it('should always accept safe requests with an Origin header', async function () {
        assert.equal(await get(port, EVIL_ORIGIN), 200);
      });

      it(`should ${allowCors ? 'accept' : 'reject'} a POST with an Origin header`, async function () {
        assert.equal(await post(port, EVIL_ORIGIN), allowCors ? 200 : 403);
      });

      it(`should ${allowCors ? 'accept' : 'reject'} a WebSocket upgrade with an Origin header`, async function () {
        assert.equal(await connect(port, EVIL_ORIGIN), allowCors ? 'open' : 403);
      });
    });

    describe(`legacy Express upgrade handler with allowCors=${allowCors}`, function () {
      let httpServer: http.Server;
      let port: number;

      before(async function () {
        port = await getTestPort();
        const app = express();
        const wss = newWsServer();
        wss.on('connection', () => {});
        configureServer({
          app,
          addRoutes: addTestRoutes,
          allowCors,
          webSocketsMapping: {[WS_PATH]: wss},
          useLegacyUpgradeHandler: true,
          frontRouter: express.Router(),
        });
        httpServer = http.createServer(app);
        await new Promise<void>((resolve) => httpServer.listen(port, TEST_HOST, resolve));
      });

      after(async function () {
        httpServer.closeAllConnections();
        await new Promise((resolve) => httpServer.close(resolve));
      });

      it('should accept a WebSocket upgrade without an Origin header', async function () {
        assert.equal(await connect(port), 'open');
      });

      it(`should ${allowCors ? 'accept' : 'reject'} a WebSocket upgrade with an Origin header`, async function () {
        assert.equal(await connect(port, EVIL_ORIGIN), allowCors ? 'open' : 403);
      });
    });
  }
});
