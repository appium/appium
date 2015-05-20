// transpile:mocha

import { BaseDriver } from '../..';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mochawait';

chai.should();
chai.use(chaiAsPromised);

describe('BaseDriver', () => {
  it('should work', async () => {
    new BaseDriver();
  });
});

