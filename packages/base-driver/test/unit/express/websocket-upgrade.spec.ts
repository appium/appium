import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {tryHandleWebSocketUpgrade} from '../../../lib/express/middleware';

interface FakeReq {
  headers: Record<string, string>;
  url: string;
}

class FakeSocket {
  written: string[] = [];
  destroyed = false;
  write(chunk: string): boolean {
    this.written.push(chunk);
    return true;
  }
  destroy(): void {
    this.destroyed = true;
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

describe('tryHandleWebSocketUpgrade origin validation', function () {
  it('should upgrade when no Origin header is present (non-browser client)', function () {
    const wsServer = new FakeWSServer();
    const socket = new FakeSocket();
    const handled = tryHandleWebSocketUpgrade(
      fakeReq({upgrade: 'websocket', host: 'localhost:4723'}) as never,
      socket as never,
      Buffer.from('') as never,
      {'/session/:sid/bidi': wsServer as never},
    );
    assert.strictEqual(handled, true);
    assert.strictEqual(wsServer.upgraded, true);
    assert.strictEqual(socket.destroyed, false);
  });

  it('should upgrade when Origin matches Host (same-origin browser client)', function () {
    const wsServer = new FakeWSServer();
    const socket = new FakeSocket();
    const handled = tryHandleWebSocketUpgrade(
      fakeReq({upgrade: 'websocket', host: 'localhost:4723', origin: 'http://localhost:4723'}) as never,
      socket as never,
      Buffer.from('') as never,
      {'/session/:sid/bidi': wsServer as never},
    );
    assert.strictEqual(handled, true);
    assert.strictEqual(wsServer.upgraded, true);
    assert.strictEqual(socket.destroyed, false);
  });

  it('should allow a cross-origin upgrade when allowCrossOrigin is set', function () {
    const wsServer = new FakeWSServer();
    const socket = new FakeSocket();
    const handled = tryHandleWebSocketUpgrade(
      fakeReq({upgrade: 'websocket', host: 'localhost:4723', origin: 'http://evil.example'}) as never,
      socket as never,
      Buffer.from('') as never,
      {'/session/:sid/bidi': wsServer as never},
      true,
    );
    assert.strictEqual(handled, true);
    assert.strictEqual(wsServer.upgraded, true);
    assert.strictEqual(socket.destroyed, false);
  });

  it('should reject a cross-origin WebSocket upgrade', function () {
    const wsServer = new FakeWSServer();
    const socket = new FakeSocket();
    const handled = tryHandleWebSocketUpgrade(
      fakeReq({upgrade: 'websocket', host: 'localhost:4723', origin: 'http://evil.example'}) as never,
      socket as never,
      Buffer.from('') as never,
      {'/session/:sid/bidi': wsServer as never},
    );
    assert.strictEqual(handled, true);
    assert.strictEqual(wsServer.upgraded, false);
    assert.strictEqual(socket.destroyed, true);
    assert.ok(socket.written.join('').includes('403'));
  });

  it('should reject an unparseable Origin header', function () {
    const wsServer = new FakeWSServer();
    const socket = new FakeSocket();
    const handled = tryHandleWebSocketUpgrade(
      fakeReq({upgrade: 'websocket', host: 'localhost:4723', origin: 'not-a-url'}) as never,
      socket as never,
      Buffer.from('') as never,
      {'/session/:sid/bidi': wsServer as never},
    );
    assert.strictEqual(handled, true);
    assert.strictEqual(wsServer.upgraded, false);
    assert.strictEqual(socket.destroyed, true);
  });
});
