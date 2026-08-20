import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {describe, it} from 'node:test';

import type {HTTPMethod} from '@appium/types';

import {METHOD_MAP, routeToCommandName} from '../../../lib/protocol';

describe('Routes', function () {
  describe('ensure protocol consistency', function () {
    // TODO test against an explicit protocol rather than a hash of a previous
    // protocol
    it('should not change protocol between patch versions', function () {
      const shasum = crypto.createHash('sha1');
      for (const [url, urlMapping] of Object.entries(METHOD_MAP)) {
        shasum.update(url);
        for (const [method, methodMapping] of Object.entries(
          urlMapping as Record<
            string,
            {command?: string; payloadParams?: {required?: any[]; optional?: any[]; wrap?: string}}
          >,
        )) {
          shasum.update(method);
          if (methodMapping.command) {
            shasum.update(methodMapping.command);
          }
          if (methodMapping.payloadParams) {
            let allParams = (methodMapping.payloadParams.required ?? []).flat();
            if (methodMapping.payloadParams.optional) {
              allParams = allParams.concat((methodMapping.payloadParams.optional ?? []).flat());
            }
            for (const param of allParams) {
              shasum.update(String(param));
            }
            if (methodMapping.payloadParams.wrap) {
              shasum.update('skip');
              shasum.update(methodMapping.payloadParams.wrap);
            }
          }
        }
      }
      const hash = shasum.digest('hex').substring(0, 8);
      // Update this value again only when an intentional route/command/param change is made.
      assert.strictEqual(hash, '8b461b1a');
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
