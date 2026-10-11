import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {PassThrough, Readable} from 'node:stream';
import {describe, it} from 'node:test';

import {fs, logger, tempDir} from '@appium/support';
import {WebSocket, WebSocketServer} from 'ws';

import {Storage, StorageArgumentError} from '../../lib/storage.js';

describe('concurrent storage uploads', function () {
  it('rejects a busy WebSocket upload and permits a later retry', {timeout: 4000}, async function (t) {
    const root = await tempDir.openDir();
    const storage = new Storage(root, true, true, logger.getLogger());
    const server = new WebSocketServer({port: 0, host: '127.0.0.1'});
    const clients: WebSocket[] = [];
    const content = Buffer.from('a complete upload');
    const sha1 = createHash('sha1').update(content).digest('hex');
    const firstSource = new PassThrough();
    const first = storage.add({name: 'app.apk', sha1}, firstSource);
    void first.catch(() => {});
    try {
      await once(server, 'listening', {signal: t.signal});
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      const connect = async () => {
        const connection = once(server, 'connection', {signal: t.signal});
        const client = new WebSocket(`ws://127.0.0.1:${address.port}`);
        clients.push(client);
        client.on('error', () => {});
        await once(client, 'open', {signal: t.signal});
        const [source] = await connection;
        return {client, source: source as WebSocket};
      };
      const busy = await connect();
      const closed = once(busy.client, 'close', {signal: t.signal});
      await assert.rejects(storage.add({name: 'APP.apk', sha1}, busy.source), StorageArgumentError);
      assert.equal((await closed)[0], 1013);

      firstSource.end(content);
      await first;
      const retry = await connect();
      const retried = storage.add({name: 'app.apk', sha1}, retry.source);
      retry.client.send(content);
      await retried;
      assert.deepEqual(
        (await storage.list()).map(({name}) => name),
        ['app.apk'],
      );
      assert.equal(await fs.hash(`${root}/app.apk`), sha1);
    } finally {
      firstSource.end(content);
      await first.catch(() => {});
      for (const client of clients) {
        client.terminate();
      }
      for (const client of server.clients) {
        client.terminate();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await fs.rimraf(root);
    }
  });

  it('continues to serialize ordinary streams', async function () {
    const root = await tempDir.openDir();
    const storage = new Storage(root, true, true, logger.getLogger());
    const content = Buffer.from('stream upload');
    const sha1 = createHash('sha1').update(content).digest('hex');
    const firstSource = new PassThrough();
    try {
      const first = storage.add({name: 'app.apk', sha1}, firstSource);
      const second = storage.add({name: 'app.apk', sha1}, Readable.from([content]));
      firstSource.end(content);
      await Promise.all([first, second]);
      assert.equal(await fs.hash(`${root}/app.apk`), sha1);
    } finally {
      await fs.rimraf(root);
    }
  });
});
