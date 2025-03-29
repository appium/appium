import {match} from 'path-to-regexp';
import sinon from 'sinon';
import log from '../../../lib/express/logger';
import {handleLogContext} from '../../../lib/express/middleware';

describe('middleware', function () {
  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

  describe('match', function () {
    it('should match static path pattern', function () {
      const pathname = '/ws/session/1234/appium/device/syslog';
      const url = 'ws://127.0.0.1:8000/ws/session/1234/appium/device/syslog';
      const currentPathname = new URL(url).pathname;
      match(pathname)(currentPathname).should.not.be.false;
    });

    it('should match dynamic path pattern', function () {
      const pathname = '/ws/session/:sessionId/appium/device/syslog';
      const url = 'ws://127.0.0.1:8000/ws/session/1234/appium/device/syslog';
      const currentPathname = new URL(url).pathname;
      match(pathname)(currentPathname).should.not.be.false;
    });
  });

  describe('handleLogContext', function () {
    let req, res, next, updateAsyncContextStub;

    beforeEach(function () {
      req = {
        headers: {},
        url: '/some/path'
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

      updateAsyncContextStub.calledOnce.should.be.true;
      updateAsyncContextStub.firstCall.args[0].should.have.property('requestId', testRequestId);
      next.calledOnce.should.be.true;
    });

    it('should handle x-request-id when provided as array', function () {
      const testRequestId = '123-test-id';
      req.headers['x-request-id'] = [testRequestId, 'ignored-id'];

      handleLogContext(req, res, next);

      updateAsyncContextStub.calledOnce.should.be.true;
      updateAsyncContextStub.firstCall.args[0].should.have.property('requestId', testRequestId);
      next.calledOnce.should.be.true;
    });

    it('should generate uuid when x-request-id is not provided', function () {
      handleLogContext(req, res, next);

      updateAsyncContextStub.calledOnce.should.be.true;
      updateAsyncContextStub.firstCall.args[0].should.have.property('requestId');
      updateAsyncContextStub.firstCall.args[0].requestId.should.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      next.calledOnce.should.be.true;
    });
  });
});
