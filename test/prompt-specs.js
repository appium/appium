// transpile:mocha

import chai from 'chai';
import { fixIt, clear } from '../lib/docChecks/prompt';
import { inquirer } from '../lib/docChecks/utils';
import { withMocks, verify } from 'appium-test-support';

chai.should();
let P = Promise; // eslint-disable-line

describe('prompt', withMocks({inquirer}, (mocks) => {

  it('fixit - yes', async () => {
    clear();
    mocks.inquirer.expects('prompt').once().returns(P.resolve(
      { confirmation: 'yes' }));
    (await fixIt()).should.equal('yes');
    verify(mocks);
  });

  it('fixit always ', async () => {
    clear();
    mocks.inquirer.expects('prompt').once().returns(P.resolve(
      { confirmation: 'always' }));
    (await fixIt()).should.equal('yes');
    (await fixIt()).should.equal('yes');
    (await fixIt()).should.equal('yes');
    verify(mocks);
  });

  it('fixit never ', async () => {
    clear();
    mocks.inquirer.expects('prompt').once().returns(P.resolve(
      { confirmation: 'never' }));
    (await fixIt()).should.equal('no');
    (await fixIt()).should.equal('no');
    (await fixIt()).should.equal('no');
    verify(mocks);
  });


}));
