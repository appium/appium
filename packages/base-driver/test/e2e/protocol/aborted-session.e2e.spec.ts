import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {EventEmitter, once} from 'node:events';
import {Agent, request, type ServerResponse} from 'node:http';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {setImmediate as nextTurn} from 'node:timers/promises';

import {getTestPort, TEST_HOST} from '@appium/driver-test-support';
import type {AppiumServer, Constraints, Driver} from '@appium/types';
import axios from 'axios';
import {createSandbox} from 'sinon';

import {BaseDriver, routeConfiguringFunction, server} from '../../../lib';
import {FakeDriver} from './fake-driver';

class SessionDriver extends FakeDriver {
  readonly sessions = new Set<string>();

  async createSession(...args: Parameters<FakeDriver['createSession']>) {
    const result = await super.createSession(...args);
    this.sessions.add(result[0]);
    return result;
  }

  sessionExists(sessionId?: string | null) {
    return typeof sessionId === 'string' && this.sessions.has(sessionId);
  }

  async deleteSession(sessionId = this.sessionId) {
    if (sessionId) {
      this.sessions.delete(sessionId);
    }
    await super.deleteSession();
  }
}

describe('Aborted session creation', function () {
  const caps = {capabilities: {alwaysMatch: {platformName: 'Fake'}}};
  const sandbox = createSandbox();
  let driver: SessionDriver;
  let appiumServer: AppiumServer;
  let baseUrl: string;
  let events: EventEmitter;
  let httpAgent: Agent;
  let pendingRequests: Promise<unknown>[];

  beforeEach(async function () {
    driver = new SessionDriver();
    events = new EventEmitter();
    httpAgent = new Agent({keepAlive: false});
    pendingRequests = [];
    await startServer(driver);
  });

  async function startServer(sessionDriver: Driver) {
    const port = await getTestPort();
    baseUrl = `http://${TEST_HOST}:${port}`;
    appiumServer = await server({
      routeConfiguringFunction: routeConfiguringFunction(sessionDriver),
      port,
      hostname: TEST_HOST,
    });
    appiumServer.on('request', (_req, res) => {
      events.emit('request', res);
    });
  }

  afterEach(async function () {
    events.emit('release');
    await Promise.allSettled(pendingRequests);
    httpAgent.destroy();
    appiumServer.closeAllConnections();
    await appiumServer.close();
    sandbox.restore();
  });

  function pauseCreation() {
    const original = driver.createSession.bind(driver);
    const released = once(events, 'release');
    return sandbox.stub(driver, 'createSession').callsFake(async (...args) => {
      events.emit('creating');
      await released;
      return original(...args);
    });
  }

  function whenSessionDeleted() {
    const original = driver.deleteSession.bind(driver);
    return new Promise<void>((resolve) => {
      sandbox.stub(driver, 'deleteSession').callsFake(async (id) => {
        await original(id);
        resolve();
      });
    });
  }

  function whenWarned() {
    return new Promise<string>((resolve) => {
      sandbox.stub(driver.log, 'warn').callsFake((message) => resolve(String(message)));
    });
  }

  function postSession(key?: string) {
    const response = axios.post<{value: {sessionId: string}}>(`${baseUrl}/session`, caps, {
      headers: key === undefined ? {} : {'X-Idempotency-Key': key},
      httpAgent,
      timeout: 5000,
      validateStatus: null,
    });
    pendingRequests.push(response);
    return response;
  }

  async function startAbortedRequest(key?: string) {
    const received = once(events, 'request');
    const headers: Record<string, string> = {'Content-Type': 'application/json'};
    if (key !== undefined) {
      headers['X-Idempotency-Key'] = key;
    }
    const client = request(`${baseUrl}/session`, {
      method: 'POST',
      headers,
      agent: httpAgent,
    });
    client.on('error', (error: NodeJS.ErrnoException) => {
      assert.equal(error.code, 'ECONNRESET');
    });
    client.end(JSON.stringify(caps));
    const response: ServerResponse = (await received)[0];
    return async () => {
      const closed = once(response, 'close');
      client.destroy();
      await closed;
    };
  }

  it('should delete an unkeyed session created after disconnect', async function () {
    pauseCreation();
    const creating = once(events, 'creating');
    const abort = await startAbortedRequest();
    await creating;
    await abort();
    assert.equal(driver.sessions.size, 0);

    const deleted = whenSessionDeleted();
    events.emit('release');
    await deleted;
    assert.equal(driver.sessions.size, 0);
  });

  it('should keep a session after its response is sent and the connection closes', async function () {
    const {data} = await postSession();
    assert.ok(driver.sessionExists(data.value.sessionId));
    const response = await axios.get(`${baseUrl}/session/${data.value.sessionId}/url`, {httpAgent});
    assert.equal(response.data.value, 'http://foobar.com');
  });

  it('should delete a session if the connection closes while sending its response', async function () {
    const deleted = whenSessionDeleted();
    appiumServer.frontRouter.use((_req, res, next) => {
      res.json = () => {
        res.destroy();
        return res;
      };
      next();
    });
    await assert.rejects(postSession(), /socket hang up/);
    await deleted;
    assert.equal(driver.sessions.size, 0);
  });

  it('should retain the serialized keyed response if its connection closes while sending', async function () {
    const key = randomUUID();
    const creation = sandbox.spy(driver, 'createSession');
    const deletion = sandbox.spy(driver, 'deleteSession');
    let disconnect = true;
    appiumServer.frontRouter.use((_req, res, next) => {
      if (disconnect) {
        disconnect = false;
        res.app.set('json spaces', 2);
        res.setHeader('X-Session-Reply', 'retained');
        const json = res.json.bind(res);
        res.json = (body: unknown) => {
          res.destroy();
          return json(body);
        };
      }
      next();
    });
    await assert.rejects(postSession(key), /socket hang up/);
    const response = await axios.post<string>(`${baseUrl}/session`, caps, {
      httpAgent,
      headers: {'X-Idempotency-Key': key},
      responseType: 'text',
      timeout: 5000,
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers['x-session-reply'], 'retained');
    assert.match(String(response.headers['content-type']), /application\/json/);
    assert.match(response.data, /\n {2}"value"/);
    assert.equal(Number(response.headers['content-length']), Buffer.byteLength(response.data));
    assert.deepEqual([...driver.sessions], [JSON.parse(response.data).value.sessionId]);
    assert.equal(creation.callCount, 1);
    assert.equal(deletion.callCount, 0);
  });

  for (const invalidKey of ['empty', 'reused for another path']) {
    it(`should clean up an abandoned session whose key is ${invalidKey}`, async function () {
      const key = invalidKey === 'empty' ? '' : randomUUID();
      if (key) {
        appiumServer.frontRouter.post('/other', (_req, res) => res.json({value: null}));
        await axios.post(`${baseUrl}/other`, {}, {httpAgent, headers: {'X-Idempotency-Key': key}});
      }
      pauseCreation();
      const creating = once(events, 'creating');
      const abort = await startAbortedRequest(key);
      await creating;
      await abort();
      const deleted = whenSessionDeleted();
      events.emit('release');
      await deleted;
      assert.equal(driver.sessions.size, 0);
    });
  }

  it('should preserve an unrelated session when a new session request disconnects', async function () {
    const existing = (await postSession()).data.value.sessionId;
    pauseCreation();
    const creating = once(events, 'creating');
    const abort = await startAbortedRequest();
    await creating;
    await abort();
    const deleted = whenSessionDeleted();
    events.emit('release');
    await deleted;
    assert.deepEqual([...driver.sessions], [existing]);
  });

  it('should not delete a session when creation fails', async function () {
    sandbox.stub(driver, 'createSession').callsFake(async () => {
      events.emit('creating');
      await once(events, 'release');
      throw new Error('Session setup failed');
    });
    const deleted = sandbox.spy(driver, 'deleteSession');
    const creating = once(events, 'creating');
    const abort = await startAbortedRequest();
    await creating;
    await abort();
    events.emit('release');
    await axios.get(`${baseUrl}/status`, {httpAgent});
    assert.equal(driver.sessions.size, 0);
    assert.equal(deleted.callCount, 0);
  });

  it('should log a cleanup failure without crashing the server', async function () {
    pauseCreation();
    sandbox.stub(driver, 'deleteSession').rejects(new Error('Cleanup failed'));
    const warned = whenWarned();
    const creating = once(events, 'creating');
    const abort = await startAbortedRequest();
    await creating;
    await abort();
    events.emit('release');
    assert.match(await warned, /Could not delete abandoned session.*Cleanup failed/);
    assert.equal((await axios.get(`${baseUrl}/status`, {httpAgent})).status, 200);
  });

  it('should replay a successful session response without creating another session', async function () {
    const key = randomUUID();
    const first = await postSession(key);
    const second = await postSession(key);
    assert.equal(second.data.value.sessionId, first.data.value.sessionId);
    assert.equal(driver.sessions.size, 1);
  });

  it('should send oversized responses without caching them', async function () {
    const {data} = await postSession();
    const payload = 'x'.repeat(2 * 1024 * 1024);
    const setUrl = sandbox.stub(driver, 'setUrl').resolves(payload);
    const key = randomUUID();
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await axios.post(
        `${baseUrl}/session/${data.value.sessionId}/url`,
        {url: 'http://example.com'},
        {httpAgent, headers: {'X-Idempotency-Key': key}, timeout: 5000},
      );
      assert.equal(response.status, 200);
      assert.equal(response.data.value, payload);
    }
    assert.equal(setUrl.callCount, 2);
  });

  it('should replay encoded and binary response chunks without changing bytes', async function () {
    let requests = 0;
    appiumServer.frontRouter.post('/encoded', (_req, res) => {
      requests++;
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', '5');
      res.write('\u00e9', 'latin1');
      const binary = new Uint8Array([0, 255]);
      res.write(binary, () => {
        binary.fill(0);
        res.end(Buffer.from([128, 129]));
      });
    });
    const key = randomUUID();
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await axios.post<Buffer>(`${baseUrl}/encoded`, null, {
        httpAgent,
        headers: {'X-Idempotency-Key': key},
        responseType: 'arraybuffer',
        timeout: 5000,
      });
      assert.deepEqual(response.data, Buffer.from([233, 0, 255, 128, 129]));
    }
    assert.equal(requests, 1);
  });

  it('should share a successful response with waiting retries', async function () {
    const key = randomUUID();
    const creation = pauseCreation();
    const creating = once(events, 'creating');
    const first = postSession(key);
    await creating;
    const received = once(events, 'request');
    const retry = postSession(key);
    await received;
    events.emit('release');
    const [firstResponse, retryResponse] = await Promise.all([first, retry]);
    assert.equal(firstResponse.data.value.sessionId, retryResponse.data.value.sessionId);
    assert.equal(driver.sessions.size, 1);
    assert.equal(creation.callCount, 1);
  });

  it('should clean up wrapped driver results and log returned cleanup errors', async function () {
    pauseCreation();
    const original = driver.executeCommand.bind(driver);
    sandbox.stub(driver, 'executeCommand').callsFake(async (command, ...args) => {
      if (command === 'deleteSession') {
        return {protocol: 'W3C', error: new Error('Wrapped cleanup failure')};
      }
      return {protocol: 'W3C', value: await original(command, ...args)};
    });
    const warned = whenWarned();
    const creating = once(events, 'creating');
    const abort = await startAbortedRequest();
    await creating;
    await abort();
    events.emit('release');
    assert.match(await warned, /Could not delete abandoned session.*Wrapped cleanup failure/);
  });

  it('should allow a later retry after the original request disconnects', async function () {
    const key = randomUUID();
    const creation = pauseCreation();
    const creating = once(events, 'creating');
    const abort = await startAbortedRequest(key);
    await creating;
    await abort();
    const retry = postSession(key);
    events.emit('release');
    const {data} = await retry;
    assert.ok(driver.sessionExists(data.value.sessionId));
    assert.equal(driver.sessions.size, 1);
    assert.equal(creation.callCount, 1);
    assert.equal((await postSession(key)).data.value.sessionId, data.value.sessionId);
  });

  it('should share the original session with waiting retries when the original disconnects', async function () {
    const key = randomUUID();
    const creation = pauseCreation();
    const creating = once(events, 'creating');
    const abort = await startAbortedRequest(key);
    await creating;
    const firstReceived = once(events, 'request');
    const firstRetry = postSession(key);
    await firstReceived;
    const secondReceived = once(events, 'request');
    const secondRetry = postSession(key);
    await secondReceived;
    await abort();
    events.emit('release');
    const [first, second] = await Promise.all([firstRetry, secondRetry]);
    assert.equal(first.data.value.sessionId, second.data.value.sessionId);
    assert.ok(driver.sessionExists(first.data.value.sessionId));
    assert.equal(driver.sessions.size, 1);
    assert.equal(creation.callCount, 1);
  });

  it('should not start another session for a retry that also disconnected', async function () {
    const key = randomUUID();
    const creation = pauseCreation();
    const creating = once(events, 'creating');
    const abort = await startAbortedRequest(key);
    await creating;
    const abortRetry = await startAbortedRequest(key);
    await abortRetry();
    await abort();
    const deleted = sandbox.spy(driver, 'deleteSession');
    events.emit('release');
    await axios.get(`${baseUrl}/status`, {httpAgent});
    const [originalSessionId] = driver.sessions;
    assert.ok(originalSessionId);
    const response = await postSession(key);
    assert.equal(creation.callCount, 1);
    assert.equal(deleted.callCount, 0);
    assert.deepEqual([...driver.sessions], [response.data.value.sessionId]);
    assert.equal(response.data.value.sessionId, originalSessionId);
  });

  it('should deliver an oversized session response to waiting retries without repeating setup', async function () {
    const key = randomUUID();
    const payload = 'x'.repeat(2 * 1024 * 1024);
    const original = driver.createSession.bind(driver);
    const creation = sandbox.stub(driver, 'createSession').callsFake(async (...args) => {
      events.emit('creating');
      await once(events, 'release');
      const [id, capabilities] = await original(...args);
      return [id, {...capabilities, 'appium:large': payload}];
    });
    const creating = once(events, 'creating');
    const abort = await startAbortedRequest(key);
    await creating;
    const received = once(events, 'request');
    const retry = postSession(key);
    await received;
    await abort();
    events.emit('release');
    const response = await retry;
    assert.equal(response.status, 200);
    assert.ok(JSON.stringify(response.data).includes(payload));
    assert.deepEqual([...driver.sessions], [response.data.value.sessionId]);
    assert.equal(creation.callCount, 1);
  });

  it('should deliver the original result to waiting retries even if the pending cache entry is evicted', async function () {
    const key = randomUUID();
    const creation = pauseCreation();
    const creating = once(events, 'creating');
    const abort = await startAbortedRequest(key);
    await creating;
    const received = once(events, 'request');
    const retry = postSession(key);
    await received;
    await abort();
    appiumServer.frontRouter.post('/other', (_req, res) => res.json({value: null}));
    for (let index = 0; index < 64; index++) {
      await axios.post(`${baseUrl}/other`, {}, {httpAgent, headers: {'X-Idempotency-Key': randomUUID()}});
    }
    events.emit('release');
    const response = await retry;
    assert.equal(response.status, 200);
    assert.deepEqual([...driver.sessions], [response.data.value.sessionId]);
    assert.equal(creation.callCount, 1);
  });

  describe('with the BaseDriver command queue', function () {
    let queuedDriver: BaseDriver<Constraints>;

    beforeEach(async function () {
      await appiumServer.close();
      queuedDriver = new BaseDriver(driver.initialOpts);
      queuedDriver.newCommandTimeoutMs = 0;
      await startServer(queuedDriver);
    });

    function pauseAfterCreation() {
      const originalCreate = queuedDriver.createSession.bind(queuedDriver);
      const released = once(events, 'release');
      return sandbox.stub(queuedDriver, 'createSession').callsFake(async (...args) => {
        const result = await originalCreate(...args);
        events.emit('creating');
        await released;
        return result;
      });
    }

    it('should replay the original error when abandoned keyed setup fails', async function () {
      const key = randomUUID();
      const originalCreate = queuedDriver.createSession.bind(queuedDriver);
      const creation = sandbox.stub(queuedDriver, 'createSession').callsFake(originalCreate);
      creation.onFirstCall().callsFake(async () => {
        events.emit('creating');
        await once(events, 'release');
        throw new Error('Setup failed');
      });
      const creating = once(events, 'creating');
      const abort = await startAbortedRequest(key);
      await creating;
      await abort();
      const received = once(events, 'request');
      const retry = postSession(key);
      await received;
      events.emit('release');
      const response = await retry;
      assert.equal(response.status, 500);
      assert.match(JSON.stringify(response.data), /Setup failed/);
      const later = await postSession(key);
      assert.equal(later.status, 500);
      assert.deepEqual(later.data, response.data);
      assert.equal(creation.callCount, 1);
      assert.equal(queuedDriver.sessionId, null);
    });

    for (const retryBeforeAbort of [true, false]) {
      it(`should give ${retryBeforeAbort ? 'waiting' : 'new'} retries the original session after setup finishes`, async function () {
        const key = randomUUID();
        const creation = pauseAfterCreation();
        const deletion = sandbox.spy(queuedDriver, 'deleteSession');
        const creating = once(events, 'creating');
        const abort = await startAbortedRequest(key);
        await creating;
        const abandonedSessionId = queuedDriver.sessionId;
        assert.ok(abandonedSessionId);
        if (!retryBeforeAbort) {
          await abort();
        }
        const firstReceived = once(events, 'request');
        const firstRetry = postSession(key);
        await firstReceived;
        const secondReceived = once(events, 'request');
        const secondRetry = postSession(key);
        await secondReceived;
        if (retryBeforeAbort) {
          await abort();
        }
        await nextTurn();
        assert.equal(creation.callCount, 1);
        events.emit('release');
        const [first, second] = await Promise.all([firstRetry, secondRetry]);
        assert.equal(first.status, 200);
        assert.equal(second.status, 200);
        assert.equal(first.data.value.sessionId, second.data.value.sessionId);
        assert.equal(first.data.value.sessionId, abandonedSessionId);
        assert.ok(queuedDriver.sessionExists(first.data.value.sessionId));
        assert.equal(creation.callCount, 1);
        const later = await postSession(key);
        assert.equal(later.status, 200);
        assert.equal(later.data.value.sessionId, first.data.value.sessionId);
        assert.ok(queuedDriver.sessionExists(later.data.value.sessionId));
        assert.equal(deletion.callCount, 0);
        await queuedDriver.deleteSession();
      });
    }
  });
});
