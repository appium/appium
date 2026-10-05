import assert from 'node:assert/strict';
import http from 'node:http';
import type {AddressInfo} from 'node:net';
import {describe, it} from 'node:test';

import {fs} from '@appium/support';

import {configureApp} from '../../../lib/basedriver/helpers/index.js';

describe('app download URL credentials', function () {
  const cases = [
    {name: 'plain credentials', username: 'user', password: 'pass'},
    {name: 'encoded delimiters', username: 'user@example.com', password: 'p@ss:/ word'},
    {name: 'literal percent escapes', username: 'user%40name', password: 'pass%2Fword'},
    {name: 'Unicode credentials', username: 'ユーザー', password: 'パスワード'},
  ];
  for (const {name, username, password} of cases) {
    it(`authenticates with ${name}`, async function () {
      const expectedAuth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      const payload = 'synthetic apk payload';
      let receivedAuth: string | undefined;
      const server = http.createServer((req, res) => {
        receivedAuth = req.headers.authorization;
        if (receivedAuth !== expectedAuth) {
          res.writeHead(401);
          res.end();
          return;
        }
        res.end(payload);
      });
      let appPath: string | undefined;
      try {
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        const {port} = server.address() as AddressInfo;
        const url = new URL(`http://127.0.0.1:${port}/auth.apk`);
        url.username = encodeURIComponent(username);
        url.password = encodeURIComponent(password);

        appPath = await configureApp(url.href, '.apk');

        assert.equal(receivedAuth, expectedAuth);
        assert.equal(await fs.readFile(appPath, 'utf8'), payload);
      } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        if (appPath) {
          await fs.unlink(appPath);
        }
      }
    });
  }
});
