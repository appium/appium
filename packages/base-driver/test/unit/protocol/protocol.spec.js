import {expect} from 'chai';
import { checkParams, getSessionId } from '../../../lib/protocol/protocol';
import {FakeDriver} from '@appium/fake-driver';

describe('Protocol', function () {
  let chai;
  let should;

  before(async function () {
    chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    should = chai.should();
  });

  describe('getSessionId', function () {
    const sessionId = '7b918a26-0649-11f1-b909-e2a798b4b114';
    const fakeDriver = new FakeDriver();
    it('should pick up the first value as the session id', function () {
      const req = {params: {sessionId: [sessionId]}};
      getSessionId(fakeDriver, req).should.eql(sessionId);
    });

    it('should get session id', function () {
      const req = {params: {sessionId}};
      getSessionId(fakeDriver, req).should.eql(sessionId);
    });

    it('should be undefined', function () {
      const req = {params: {sessionId: undefined}};
      expect(getSessionId(fakeDriver, req)).to.eql(undefined);
    });
  });

  describe('checkParams', function () {
    it('should pass if no params are needed, but some are given', function () {
      const args = checkParams(
        {},
        {
          foo: 'foo',
          bar: 'bar',
          baz: 'baz',
        }
      );
      args.should.eql({});
    });

    it('should preserve session id', function () {
      const args = checkParams(
        {
          optional: ['bar', 'baz'],
        },
        {
          sessionId: 'sessionId',
          id: 'id',
          bar: 'bar',
        }
      );
      args.should.eql({
        sessionId: 'sessionId',
        id: 'id',
        bar: 'bar',
      });
    });

    it('should pass if no required params are needed', function () {
      const args = checkParams(
        {
          optional: ['bar', 'baz'],
        },
        {
          foo: 'foo',
          bar: 'bar',
          baz: 'baz',
        }
      );
      args.should.eql({
        bar: 'bar',
        baz: 'baz'
      });
    });

    it('should drop unknown params', function () {
      const args = checkParams(
        {
          required: ['foo'],
          optional: ['bar'],
        },
        {
          foo: 'foo',
          bar: 'bar',
          baz: 'baz',
        }
      );
      args.should.eql({
          foo: 'foo',
          bar: 'bar'
      });
    });

    it('should fail if required params are missing', function () {
      should.throw(() => {
        checkParams(
          {
            required: ['foo'],
            optional: ['bar'],
          },
          {
            bar: 'bar',
            baz: 'baz',
          }
        );
      });
    });

    it('should pass if a set of required params is matched', function () {
      const args = checkParams(
        {
          required: [['foo'], ['bar']],
          optional: ['baz'],
        },
        {
          foo: 'foo',
          bar: 'bar',
          baz: 'baz',
        }
      );
      args.should.eql({
        foo: 'foo',
        baz: 'baz',
      });
    });
  });
});