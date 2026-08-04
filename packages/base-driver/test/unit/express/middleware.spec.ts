import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {match} from 'path-to-regexp';
import sinon from 'sinon';

import {log} from '../../../lib/express/logger';
import {handleLogContext} from '../../../lib/express/middleware';

describe('middleware', function () {
  describe('match', function () {
    it('should match static path pattern', function () {
      const pathname = '/ws/session/1234/appium/device/syslog';
      const url = 'ws://127.0.0.1:8000/ws/session/1234/appium/device/syslog';
      const currentPathname = new URL(url).pathname;
      assert.notStrictEqual(match(pathname)(currentPathname), false);
    });

    it('should match dynamic path pattern', function () {
      const pathname = '/ws/session/:sessionId/appium/device/syslog';
      const url = 'ws://127.0.0.1:8000/ws/session/1234/appium/device/syslog';
      const currentPathname = new URL(url).pathname;
      assert.notStrictEqual(match(pathname)(currentPathname), false);
    });
  });

  describe('handleLogContext', function () {
    let req: any;
    let res: any;
    let next: sinon.SinonSpy;
    let updateAsyncContextStub: sinon.SinonStub;

    beforeEach(function () {
      req = {
        headers: {},
        url: '/some/path',
      };
      res = {};
      next = sinon.spy();
      updateAsyncContextStub = sinon.stub(log, 'updateAsyncContext');
    });

    afterEach(function () {
      updateAsyncContextStub.restore();
    });

    it('should use provided x-request-id header', function () {
      const testRequestId = '123-test-id';
      req.headers['x-request-id'] = testRequestId;

      handleLogContext(req, res, next);

      assert.strictEqual(updateAsyncContextStub.calledOnce, true);
      assert.strictEqual(updateAsyncContextStub.firstCall.args[0].requestId, testRequestId);
      assert.strictEqual(next.calledOnce, true);
    });

    it('should handle x-request-id when provided as array', function () {
      const testRequestId = '123-test-id';
      req.headers['x-request-id'] = [testRequestId, 'ignored-id'];

      handleLogContext(req, res, next);

      assert.strictEqual(updateAsyncContextStub.calledOnce, true);
      assert.strictEqual(updateAsyncContextStub.firstCall.args[0].requestId, testRequestId);
      assert.strictEqual(next.calledOnce, true);
    });

    it('should generate uuid when x-request-id is not provided', function () {
      handleLogContext(req, res, next);

      assert.strictEqual(updateAsyncContextStub.calledOnce, true);
      assert.ok(Object.hasOwn(updateAsyncContextStub.firstCall.args[0], 'requestId'));
      assert.match(
        updateAsyncContextStub.firstCall.args[0].requestId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      assert.strictEqual(next.calledOnce, true);
    });
  });
});
