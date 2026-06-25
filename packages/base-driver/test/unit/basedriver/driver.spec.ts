import {expect} from 'chai';
import type {InitialOpts} from '@appium/types';
import {BaseDriver} from '../../../lib';

describe('BaseDriver', function () {
  describe('constructor', function () {
    it('should initialize "opts"', function () {
      const driver = new BaseDriver({} as InitialOpts);
      expect(driver.opts).to.exist;
    });
  });
});
