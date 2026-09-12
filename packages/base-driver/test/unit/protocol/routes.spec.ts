import assert from 'node:assert/strict';
import {describe, it, snapshot} from 'node:test';
import type {TestContext} from 'node:test';

import type {HTTPMethod} from '@appium/types';

import {METHOD_MAP, routeToCommandName} from '../../../lib/protocol/index.js';

// Tests run against the compiled build/test/**/*.js; keep the checked-in snapshot next to the
// TS source instead, so it's reviewable alongside the route change that produced it.
snapshot.setResolveSnapshotPath(
  (testFilePath) => `${testFilePath?.replace('/build/test/', '/test/').replace(/\.js$/, '.ts')}.snapshot`,
);

describe('Routes', function () {
  describe('ensure protocol consistency', function () {
    it('should not change protocol between patch versions', function (t: TestContext) {
      // Update the snapshot (`--test-update-snapshots`) only when an intentional
      // route/command/param change is made; review the diff before committing it.
      t.assert.snapshot(METHOD_MAP);
    });
  });

  describe('check route to command name conversion', function () {
    it('should properly lookup correct command name for endpoint with session', function () {
      const cmdName = routeToCommandName('/timeouts', 'POST');
      assert.strictEqual(cmdName, 'timeouts');
    });

    it('should properly lookup correct command name for endpoint without session', function () {
      const cmdName = routeToCommandName('/status', 'GET');
      assert.strictEqual(cmdName, 'getStatus');
    });

    it('should properly lookup correct command name for endpoint with query params', function () {
      const cmdName = routeToCommandName('/status?foo=1&bar=2', 'GET');
      assert.strictEqual(cmdName, 'getStatus');
    });

    it('should properly lookup correct command name with custom base path', function () {
      const cmdName = routeToCommandName('/wd/hub/status?foo=1&bar=2', 'GET', '/wd/hub');
      assert.strictEqual(cmdName, 'getStatus');
    });

    it('should properly lookup correct command name for endpoint without leading slash', function () {
      const cmdName = routeToCommandName('status', 'GET');
      assert.strictEqual(cmdName, 'getStatus');
    });

    it('should properly lookup correct command name for fully specified endpoint', function () {
      const cmdName = routeToCommandName('/status', 'GET');
      assert.strictEqual(cmdName, 'getStatus');
    });

    it('should not find command name if incorrect input data has been specified', function () {
      for (const [route, method] of [
        ['/status', 'POST'],
        ['/xstatus', 'GET'],
        ['status', 'POST'],
      ] as [string, string][]) {
        const cmdName = routeToCommandName(route, method as HTTPMethod);
        assert.strictEqual(cmdName, undefined);
      }
    });
  });
});
