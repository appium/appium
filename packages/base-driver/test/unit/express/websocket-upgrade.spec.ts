import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {tryHandleWebSocketUpgrade} from '../../../lib/express/middleware';

interface FakeReq {
  headers: Record<string, string>;
  url: string;
}

class FakeSocket {
  written: string[] = [];
  ended = false;
  end(chunk: string): void {
    this.written.push(chunk);
    this.ended = true;
  }
}

class FakeWSServer {
  upgraded = false;
  handleUpgrade(_req: unknown, _socket: unknown, _head: unknown, cb: (ws: unknown) => void): void {
    this.upgraded = true;
    cb({});
  }
  emit(_evt: string, _ws: unknown, _req: unknown): void {}
}

function fakeReq(headers: Record<string, string>, url = '/session/abc/bidi'): FakeReq {
  return {headers, url};
}

function upgrade(headers: Record<string, string>, allowCors?: boolean) {
  const wsServer = new FakeWSServer();
  const socket = new FakeSocket();
  const handled = tryHandleWebSocketUpgrade({
    req: fakeReq({upgrade: 'websocket', host: 'localhost:4723', ...headers}) as never,
    socket: socket as never,
    head: Buffer.from('') as never,
    webSocketsMapping: {'/session/:sid/bidi': wsServer as never},
    allowCors,
  });
  return {handled, wsServer, socket};
}

describe('tryHandleWebSocketUpgrade origin validation', function () {
  it('should upgrade when no Origin header is present (non-browser client)', function () {
    const {handled, wsServer, socket} = upgrade({});
    assert.strictEqual(handled, true);
    assert.strictEqual(wsServer.upgraded, true);
    assert.strictEqual(socket.ended, false);
  });

  it('should reject a same-origin upgrade unless CORS is allowed', function () {
    const {handled, wsServer, socket} = upgrade({origin: 'http://localhost:4723'});
    assert.strictEqual(handled, true);
    assert.strictEqual(wsServer.upgraded, false);
    assert.ok(socket.written.join('').includes('403'));
  });

  it('should allow a cross-origin upgrade when allowCors is set', function () {
    const {handled, wsServer, socket} = upgrade({origin: 'http://evil.example'}, true);
    assert.strictEqual(handled, true);
    assert.strictEqual(wsServer.upgraded, true);
    assert.strictEqual(socket.ended, false);
  });

  it('should reject a cross-origin WebSocket upgrade', function () {
    const {handled, wsServer, socket} = upgrade({origin: 'http://evil.example'});
    assert.strictEqual(handled, true);
    assert.strictEqual(wsServer.upgraded, false);
    assert.strictEqual(socket.ended, true);
    assert.ok(socket.written.join('').includes('403'));
  });

  it('should reject an unparseable Origin header', function () {
    const {handled, wsServer, socket} = upgrade({origin: 'not-a-url'});
    assert.strictEqual(handled, true);
    assert.strictEqual(wsServer.upgraded, false);
    assert.strictEqual(socket.ended, true);
  });

  it('should reject a rebound host whose Origin matches its Host', function () {
    const {wsServer, socket} = upgrade({host: 'evil.example:4723', origin: 'http://evil.example:4723'});
    assert.strictEqual(wsServer.upgraded, false);
    assert.strictEqual(socket.ended, true);
  });
});
