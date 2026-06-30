import {describe, it} from 'node:test';

import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {ExecuteDriverPlugin} from '../../lib/plugin';

use(chaiAsPromised);

describe('execute driver plugin', function () {
  it('should exist', function () {
    expect(ExecuteDriverPlugin).to.exist;
  });
});
