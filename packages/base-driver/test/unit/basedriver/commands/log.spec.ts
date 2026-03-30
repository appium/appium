import {expect} from 'chai';
import type {InitialOpts} from '@appium/types';
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
  let sandbox: sinon.SinonSandbox;
  let driver: BaseDriver<any, any, any, any, any, any>;

  beforeEach(function () {
    sandbox = createSandbox();
    driver = new BaseDriver({} as InitialOpts);
    driver.supportedLogTypes = {};
    (driver as any)._log = {
      debug: _.noop,
    } as any;
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getLogTypes', function () {
    it('should return empty array when no supported log types', async function () {
      expect(await driver.getLogTypes()).to.eql([]);
    });
    it('should return keys to log type object', async function () {
      driver.supportedLogTypes = SUPPORTED_LOG_TYPES as any;
      expect(await driver.getLogTypes()).to.eql(['one', 'two']);
    });
  });

  describe('getLog', function () {
    let one: sinon.SinonSpy;
    let two: sinon.SinonSpy;
    beforeEach(function () {
      one = sandbox.spy(SUPPORTED_LOG_TYPES.one, 'getter');
      two = sandbox.spy(SUPPORTED_LOG_TYPES.two, 'getter');
    });
    it('should throw error if log type not supported', async function () {
      await expect(driver.getLog('one')).to.be.rejected;
      expect(one.called).to.be.false;
      expect(two.called).to.be.false;
    });
    it('should throw an error with available log types if log type not supported', async function () {
      driver.supportedLogTypes = SUPPORTED_LOG_TYPES as any;
      let err: Error | undefined;
      try {
        await driver.getLog('three');
      } catch (_err) {
        err = _err as Error;
      }
      expect(err).to.exist;
      expect(err!.message).to.eql(
        `Unsupported log type 'three'. Supported types: {"one":"First logs","two":"Seconds logs"}`
      );
      expect(one.called).to.be.false;
      expect(two.called).to.be.false;
    });
    it('should call getter on appropriate log when found', async function () {
      driver.supportedLogTypes = SUPPORTED_LOG_TYPES as any;
      const logs = await driver.getLog('one');
      expect(logs).to.eql(FIRST_LOGS);
      expect(one.called).to.be.true;
      expect(two.called).to.be.false;
    });
  });
});
