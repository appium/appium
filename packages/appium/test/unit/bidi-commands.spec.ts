import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import type {IncomingMessage} from 'node:http';
import {describe, it} from 'node:test';

import {BaseDriver} from '@appium/base-driver';
import {BasePlugin} from '@appium/base-plugin';
import sinon from 'sinon';
import {WebSocket} from 'ws';

import type {AppiumDriver} from '../../lib/appium.js';
import {onBidiConnection, onBidiMessage} from '../../lib/bidi-commands.js';
import {BIDI_EVENT_NAME} from '../../lib/constants.js';

const SESSION_ID = 'bidi-session';
const LOG_EVENT = 'log.entryAdded';
const CONTEXT = 'NATIVE_APP';
const MAX_LOG_LINES = 50;

describe('bidi-commands', function () {
  for (const pluginHandles of [false, true]) {
    it(`should protect ${pluginHandles ? 'plugin' : 'driver'} BiDi commands from idle expiry and resume it after failure`, async function () {
      const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
      let finishCommand!: () => void;
      const pending = new Promise<void>((resolve) => {
        finishCommand = resolve;
      });
      let markStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      const handler = async () => {
        markStarted();
        await pending;
        throw new Error('BiDi failed');
      };
      class BidiDriver extends BaseDriver<any> {
        bidiBrowsingContextGetTree = handler;
      }
      class BidiPlugin extends BasePlugin {
        bidiBrowsingContextGetTree = handler;
      }
      const driver = new BidiDriver();
      driver.sessionId = SESSION_ID;
      driver.newCommandTimeoutMs = 1000;
      await driver.startNewCommandTimeout();
      const response = onBidiMessage.call(
        {} as AppiumDriver,
        Buffer.from(JSON.stringify({id: 1, method: 'browsingContext.getTree', params: {}})),
        driver,
        pluginHandles ? [new BidiPlugin('bidi')] : [],
      );
      try {
        await started;
        // An overlapping HTTP command must not rearm the timer either.
        await driver.executeCommand('getStatus');
        await clock.tickAsync(2000);
        assert.equal(driver.sessionId, SESSION_ID);
        finishCommand();
        assert.equal((await response).type, 'error');
        await clock.tickAsync(999);
        assert.equal(driver.sessionId, SESSION_ID);
        await clock.tickAsync(1);
        assert.equal(driver.sessionId, null);
      } finally {
        finishCommand();
        await response;
        await driver.clearNewCommandTimeout();
        clock.restore();
      }
    });
  }
  describe('onBidiConnection', function () {
    it('should log the first event once if writing that log line emits another event', async function () {
      const eventEmitter = new EventEmitter();
      const logLines: string[] = [];
      // Drivers may forward every server log line to BiDi clients as a log.entryAdded event
      // (e.g. if the get_server_logs feature is enabled), so writing to the log emits an event
      const writeLogLine = (text: string) => {
        logLines.push(text);
        // keep a possible recursion finite, so that it fails the assertions below instead of the stack
        if (logLines.length < MAX_LOG_LINES) {
          eventEmitter.emit(BIDI_EVENT_NAME, {context: CONTEXT, method: LOG_EVENT, params: {type: 'server', text}});
        }
      };
      const driver = {
        eventEmitter,
        log: {debug: writeLogLine, info: writeLogLine, warn: writeLogLine, error: writeLogLine},
        bidiEventSubs: {[LOG_EVENT]: [CONTEXT]},
      };
      const sentData: string[] = [];
      const ws = Object.assign(new EventEmitter(), {
        readyState: WebSocket.OPEN,
        OPEN: WebSocket.OPEN,
        send: (data: string, cb: (err?: Error) => void) => {
          sentData.push(data);
          cb();
        },
        close: () => {},
      });
      const connectionErrors: unknown[] = [];
      const appium = {
        log: {info: () => {}, debug: () => {}, error: (err: unknown) => connectionErrors.push(err)},
        sessions: {[SESSION_ID]: driver},
        bidiSockets: {},
        bidiProxyClients: {},
        pluginsForSession: () => [],
      };

      onBidiConnection.call(
        appium as unknown as AppiumDriver,
        ws as unknown as WebSocket,
        {url: `/bidi/${SESSION_ID}`} as IncomingMessage,
      );
      writeLogLine('some server log line');
      await new Promise((resolve) => setImmediate(resolve));

      assert.deepEqual(connectionErrors, []);
      assert.equal(logLines.filter((line) => line.startsWith(`<-- BIDI EVENT ${LOG_EVENT}`)).length, 1);
      const sentTexts = sentData.map((data) => JSON.parse(data).params.text as string);
      assert.equal(sentTexts.length, 2);
      assert.ok(sentTexts.includes('some server log line'));
    });
  });
});
