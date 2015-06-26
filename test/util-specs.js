// transpile:mocha

import { pkgRoot, fs, macOsxVersion, authorizeIos } from '../lib/utils';
import * as tp from 'teen_process';
import chai from 'chai';
import 'mochawait';
import path from 'path';
import B from 'bluebird';
import { withMocks, verifyAll } from './mock-utils';

chai.should();
let P = Promise;

describe('utils', () => {

  describe('macOsxVersion', withMocks({tp}, (mocks) => {
    it('it should return the correct version.', async () => {
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '10.10.1\n', stderr: ''}));
      let v = await macOsxVersion();
      v.should.equal('10.10');
      verifyAll(mocks);
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

   describe('authorizeIos', withMocks({tp}, (mocks) => {
    it('should work', async () => {
      mocks.tp.expects('exec').once().returns(P.resolve(["", ""]));
      await authorizeIos();
      verifyAll(mocks);
    });
  }));

});
