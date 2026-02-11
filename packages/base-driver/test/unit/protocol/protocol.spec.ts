import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {checkParams} from '../../../lib/protocol/protocol';

chai.use(chaiAsPromised);

describe('Protocol', function () {
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
      expect(args).to.eql({});
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
      expect(args).to.eql({
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
      expect(args).to.eql({
        bar: 'bar',
        baz: 'baz',
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
      expect(args).to.eql({
        foo: 'foo',
        bar: 'bar',
      });
    });

    it('should fail if required params are missing', function () {
      expect(() => {
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
      }).to.throw();
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
      expect(args).to.eql({
        foo: 'foo',
        baz: 'baz',
      });
    });
  });
});
