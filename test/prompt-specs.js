// transpile:mocha

import chai from 'chai';
import 'mochawait';
import {fixIt, clear } from '../lib/prompt';
import { inquirer } from '../lib/utils';
import { withMocks, verifyAll } from './mock-utils';

chai.should();
let P = Promise;

describe('prompt', withMocks({inquirer}, (mocks) => {

  it('fixit - yes', async () => {
    clear();
    mocks.inquirer.expects('prompt').once().returns(P.resolve(
      { confirmation: 'yes' }));
    (await fixIt()).should.equal('yes');
    verifyAll(mocks);
  });

  it('fixit always ', async () => {
    clear();
    mocks.inquirer.expects('prompt').once().returns(P.resolve(
      { confirmation: 'always' }));
    (await fixIt()).should.equal('yes');
    (await fixIt()).should.equal('yes');
    (await fixIt()).should.equal('yes');
    verifyAll(mocks);
  });

  it('fixit never ', async () => {
    clear();
    mocks.inquirer.expects('prompt').once().returns(P.resolve(
      { confirmation: 'never' }));
    (await fixIt()).should.equal('no');
    (await fixIt()).should.equal('no');
    (await fixIt()).should.equal('no');
    verifyAll(mocks);
  });


}));
