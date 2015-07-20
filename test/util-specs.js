// transpile:mocha

import { pkgRoot, fs, macOsxVersion } from '../lib/utils';
import * as tp from 'teen_process';
import chai from 'chai';
import 'mochawait';
import path from 'path';
import B from 'bluebird';
import { withMocks, verify } from 'appium-test-support';

chai.should();

describe('utils', () => {

  describe('macOsxVersion', withMocks({tp}, (mocks) => {
    it('it should return the correct version.', async () => {
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '10.10.1\n', stderr: ''}));
      let v = await macOsxVersion();
      v.should.equal('10.10');
      verify(mocks);
    });
  }));

  it('fs.readFile', async () => {
    (await fs.readFile(path.resolve(pkgRoot, 'test', 'fixtures',
      'wow.txt'), 'utf8')).should.include('WOW');
  });

  it('fs.exists', async () => {
    (await fs.exists(path.resolve(pkgRoot, 'test', 'fixtures',
      'wow.txt'))).should.be.ok;
    (await fs.exists(path.resolve(pkgRoot, 'test', 'fixtures',
      'notwow.txt'))).should.not.be.ok;
  });

});
