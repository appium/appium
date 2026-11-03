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
  it('should bracket IPv6 addresses in connection hints', function (t) {
    t.mock.method(os, 'networkInterfaces', () => ({
      test: [{address: '::1', family: 'IPv6', internal: true}],
    }));
    const info = t.mock.method(log, 'info', () => {});
    logServerAddress('https://[::]:4723/wd/hub');
    assert.ok(
      String(info.mock.calls[1].arguments[0]).includes(
        'https://[::1]:4723/wd/hub (only accessible from the same host)',
      ),
    );
  });
});
