import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {fetchInterfaces} from '../../../lib/helpers/network.js';

describe('helpers/network', function () {
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
