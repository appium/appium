import assert from 'node:assert/strict';
import os from 'node:os';
import {describe, it} from 'node:test';

import {log} from '../../lib/logger.js';
import {fetchInterfaces, logServerAddress} from '../../lib/network.js';

describe('network', function () {
  describe('fetchInterfaces()', function () {
    it('should fetch interfaces for ipv4 only', function () {
      assert.ok(fetchInterfaces(4).length > 0);
    });

    it('should fetch interfaces for ipv6 only', function () {
      assert.ok(fetchInterfaces(6).length > 0);
    });

    it('should fetch interfaces for ipv4 and ipv6', function () {
      assert.ok(fetchInterfaces().length > 0);
    });
  });
});

describe('logServerAddress()', function () {
  for (const [bindHost, address, family, host] of [
    ['[::]', '::1', 'IPv6', '[::1]'],
    ['[::]', '2001:db8::1', 'IPv6', '[2001:db8::1]'],
    ['0.0.0.0', '127.0.0.1', 'IPv4', '127.0.0.1'],
  ]) {
    it(`should advertise a valid URL for ${address}`, function (t) {
      t.mock.method(os, 'networkInterfaces', () => ({
        test: [{address, family, internal: true}],
      }));
      const info = t.mock.method(log, 'info', () => {});
      logServerAddress(`https://${bindHost}:4723/wd/hub`);
      const message = String(info.mock.calls[1].arguments[0]);
      const advertisedUrl = message.match(/https:\/\/\S+/)?.[0];
      assert.equal(advertisedUrl, `https://${host}:4723/wd/hub`);
      assert.equal(new URL(advertisedUrl!).hostname, host);
      assert.ok(message.includes('(only accessible from the same host)'));
    });
  }
});
