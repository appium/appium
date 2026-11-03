import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';

import type {InitialOpts} from '@appium/types';

import {BaseDriver, errors} from '../../../../lib/index.js';

const PAGE_SOURCE = '<hierarchy />';

describe('find commands -', function () {
  let driver: BaseDriver<any, any, any, any, any>;

  beforeEach(function () {
    driver = new BaseDriver({} as InitialOpts);
    driver.locatorStrategies = ['xpath'];
    (driver as any)._log = {
      debug: () => {},
      warn: () => {},
    } as any;
    (driver as any).findElOrEls = async () => {
      throw new errors.NoSuchElementError();
    };
  });

  describe('printPageSourceOnFindFailure', function () {
    it('should throw the find error when the page source has been retrieved', async function () {
      driver.opts.printPageSourceOnFindFailure = true;
      (driver as any).getPageSource = async () => PAGE_SOURCE;
      await assert.rejects(driver.findElement('xpath', '//Foo'), errors.NoSuchElementError);
    });
    it('should throw the find error when the page source cannot be retrieved', async function () {
      driver.opts.printPageSourceOnFindFailure = true;
      (driver as any).getPageSource = async () => {
        throw new errors.NotImplementedError('Not implemented yet for find.');
      };
      await assert.rejects(driver.findElements('xpath', '//Foo'), errors.NoSuchElementError);
    });
  });
});
