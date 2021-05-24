import logCommands from '../../../lib/basedriver/commands/log';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import _ from 'lodash';


chai.should();
chai.use(chaiAsPromised);
const expect = chai.expect;

const FIRST_LOGS = ['first', 'logs'];
const SECOND_LOGS = ['second', 'logs'];
const SUPPORTED_LOG_TYPES = {
  one: {
    description: 'First logs',
    getter: () => _.clone(FIRST_LOGS),
  },
  two: {
    description: 'Seconds logs',
    getter: () => _.clone(SECOND_LOGS),
  },
};

describe('log commands -', function () {
  beforeEach(function () {
    // reset the supported log types
    logCommands.supportedLogTypes = {};
  });
  describe('getLogTypes', function () {
    it('should return empty array when no supported log types', async function () {
      (await logCommands.getLogTypes()).should.eql([]);
    });
    it('should return keys to log type object', async function () {
      logCommands.supportedLogTypes = SUPPORTED_LOG_TYPES;
      (await logCommands.getLogTypes()).should.eql(['one', 'two']);
    });
  });
  describe('getLog', function () {
    beforeEach(function () {
      sinon.spy(SUPPORTED_LOG_TYPES.one, 'getter');
      sinon.spy(SUPPORTED_LOG_TYPES.two, 'getter');
    });
    afterEach(function () {
      SUPPORTED_LOG_TYPES.one.getter.restore();
      SUPPORTED_LOG_TYPES.two.getter.restore();
    });
    it('should throw error if log type not supported', async function () {
      await logCommands.getLog('one').should.eventually.be.rejected;
      SUPPORTED_LOG_TYPES.one.getter.called.should.be.false;
      SUPPORTED_LOG_TYPES.two.getter.called.should.be.false;
    });
    it('should throw an error with available log types if log type not supported', async function () {
      logCommands.supportedLogTypes = SUPPORTED_LOG_TYPES;
      let err;
      try {
        await logCommands.getLog('three');
      } catch (_err) {
        err = _err;
      }
      expect(err).to.exist;
      err.message.should.eql(`Unsupported log type 'three'. Supported types: {"one":"First logs","two":"Seconds logs"}`);
      SUPPORTED_LOG_TYPES.one.getter.called.should.be.false;
      SUPPORTED_LOG_TYPES.two.getter.called.should.be.false;
    });
    it('should call getter on appropriate log when found', async function () {
      logCommands.supportedLogTypes = SUPPORTED_LOG_TYPES;
      let logs = await logCommands.getLog('one');
      logs.should.eql(FIRST_LOGS);
      SUPPORTED_LOG_TYPES.one.getter.called.should.be.true;
      SUPPORTED_LOG_TYPES.two.getter.called.should.be.false;
    });
  });
});