// @ts-check
// eslint-disable-next-line import/named
import {createSandbox} from 'sinon';
import _ from 'lodash';
import {BaseDriver} from '../../../../lib';

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
  let sandbox;
  let driver;
  let expect;

  before(async function () {
    const chai = await import('chai');
    chai.should();
    expect = chai.expect;
  });

  beforeEach(function () {
    sandbox = createSandbox();
    driver = new BaseDriver();
    // reset the supported log types
    driver.supportedLogTypes = {};
    driver._log = /** @type {import('@appium/types').AppiumLogger} */ ({
      debug: _.noop,
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getLogTypes', function () {
    it('should return empty array when no supported log types', async function () {
      (await driver.getLogTypes()).should.eql([]);
    });
    it('should return keys to log type object', async function () {
      driver.supportedLogTypes = SUPPORTED_LOG_TYPES;
      (await driver.getLogTypes()).should.eql(['one', 'two']);
    });
  });
  describe('getLog', function () {
    /** @type {sinon.SinonSpiedMember<typeof SUPPORTED_LOG_TYPES.one.getter>} */
    let one;
    /** @type {sinon.SinonSpiedMember<typeof SUPPORTED_LOG_TYPES.two.getter>} */
    let two;
    beforeEach(function () {
      one = sandbox.spy(SUPPORTED_LOG_TYPES.one, 'getter');
      two = sandbox.spy(SUPPORTED_LOG_TYPES.two, 'getter');
    });
    it('should throw error if log type not supported', async function () {
      await driver.getLog('one').should.eventually.be.rejected;
      one.called.should.be.false;
      two.called.should.be.false;
    });
    it('should throw an error with available log types if log type not supported', async function () {
      driver.supportedLogTypes = SUPPORTED_LOG_TYPES;
      let err;
      try {
        await driver.getLog('three');
      } catch (_err) {
        err = _err;
      }
      expect(err).to.exist;
      err.message.should.eql(
        `Unsupported log type 'three'. Supported types: {"one":"First logs","two":"Seconds logs"}`
      );
      one.called.should.be.false;
      two.called.should.be.false;
    });
    it('should call getter on appropriate log when found', async function () {
      driver.supportedLogTypes = SUPPORTED_LOG_TYPES;
      let logs = await driver.getLog('one');
      logs.should.eql(FIRST_LOGS);
      one.called.should.be.true;
      two.called.should.be.false;
    });
  });
});
