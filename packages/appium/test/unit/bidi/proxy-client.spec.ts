import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {after, before, describe, it} from 'node:test';

import {WebSocketServer} from 'ws';

import {BidiProxyClient} from '../../../lib/bidi/proxy-client.js';

async function startUpstreamServer(): Promise<{wss: WebSocketServer; url: string}> {
  const wss = new WebSocketServer({port: 0, host: '127.0.0.1'});
  await new Promise<void>((resolve) => wss.once('listening', resolve));
  const {port} = wss.address() as AddressInfo;
  return {wss, url: `ws://127.0.0.1:${port}`};
}

describe('BidiProxyClient', function () {
  let wss: WebSocketServer;
  let url: string;

  before(async function () {
    ({wss, url} = await startUpstreamServer());
  });

  after(async function () {
    wss.close();
  });

  it('sends {id, method, params} upstream and resolves the unwrapped result on a matching response', async function () {
    wss.removeAllListeners('connection');
    wss.once('connection', (ws) => {
      ws.once('message', (data) => {
        const {id, method, params} = JSON.parse(data.toString());
        assert.equal(method, 'session.status');
        assert.deepEqual(params, {foo: 'bar'});
        ws.send(JSON.stringify({id, type: 'success', result: {ready: true}}));
      });
    });

    const client = new BidiProxyClient(url);
    try {
      const result = await client.executeCommand('session.status', {foo: 'bar'});
      assert.deepEqual(result, {ready: true});
    } finally {
      client.close();
    }
  });

  it('rejects with a bidiErrObject-capable error on a matching error response', async function () {
    wss.removeAllListeners('connection');
    wss.once('connection', (ws) => {
      ws.once('message', (data) => {
        const {id} = JSON.parse(data.toString());
        ws.send(JSON.stringify({id, type: 'error', error: 'unknown command', message: 'nope', stacktrace: 'trace'}));
      });
    });

    const client = new BidiProxyClient(url);
    try {
      await assert.rejects(client.executeCommand('foo.bar', {}), (err: any) => {
        assert.equal(err.message, 'nope');
        assert.equal(typeof err.bidiErrObject, 'function');
        return true;
      });
    } finally {
      client.close();
    }
  });

  it('routes a message with an unknown/non-correlating id to the unsolicited handler', async function () {
    wss.removeAllListeners('connection');
    wss.once('connection', (ws) => {
      ws.send(JSON.stringify({type: 'event', method: 'log.entryAdded', params: {text: 'hi'}}));
    });

    const client = new BidiProxyClient(url);
    try {
      const received = await new Promise<any>((resolve) => {
        client.onUnsolicitedMessage((data) => resolve(JSON.parse(data.toString())));
      });
      assert.equal(received.method, 'log.entryAdded');
    } finally {
      client.close();
    }
  });

  it('correlates multiple concurrent commands independently, even when responses arrive out of order', async function () {
    wss.removeAllListeners('connection');
    wss.once('connection', (ws) => {
      ws.on('message', (data) => {
        const {id, method} = JSON.parse(data.toString());
        // reply out of order: the second command received replies first
        const delay = method === 'first' ? 30 : 5;
        setTimeout(() => ws.send(JSON.stringify({id, type: 'success', result: {method}})), delay);
      });
    });

    const client = new BidiProxyClient(url);
    try {
      const [first, second] = await Promise.all([
        client.executeCommand('first', {}),
        client.executeCommand('second', {}),
      ]);
      assert.deepEqual(first, {method: 'first'});
      assert.deepEqual(second, {method: 'second'});
    } finally {
      client.close();
    }
  });

  it('rejects a pending command when the upstream connection closes before responding', async function () {
    wss.removeAllListeners('connection');
    wss.once('connection', (ws) => {
      ws.once('message', () => {
        ws.close();
      });
    });

    const client = new BidiProxyClient(url);
    try {
      await assert.rejects(client.executeCommand('never.responds', {}));
    } finally {
      client.close();
    }
  });
});
