import {ExecuteDriverPlugin} from '../../lib/plugin';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

describe('execute driver plugin', function () {
  it('should exist', function () {
    expect(ExecuteDriverPlugin).to.exist;
  });
});
