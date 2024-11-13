import {fixIt, clear} from '../../lib/prompt';
import * as utils from '../../lib/utils';
import {withMocks} from '@appium/test-support';
import B from 'bluebird';

describe(
  'prompt',
  withMocks({utils}, (mocks) => {
    before(async function () {
      const chai = await import('chai');
      chai.should();
    });

    it('fixit - yes', async function () {
      clear();
      mocks.utils
        .expects('prompt')
        .once()
        .returns(B.resolve({confirmation: 'yes'}));
      (await fixIt()).should.equal('yes');
      mocks.verify();
    });

    it('fixit always ', async function () {
      clear();
      mocks.utils
        .expects('prompt')
        .once()
        .returns(B.resolve({confirmation: 'always'}));
      (await fixIt()).should.equal('yes');
      (await fixIt()).should.equal('yes');
      (await fixIt()).should.equal('yes');
      mocks.verify();
    });

    it('fixit never ', async function () {
      clear();
      mocks.utils
        .expects('prompt')
        .once()
        .returns(B.resolve({confirmation: 'never'}));
      (await fixIt()).should.equal('no');
      (await fixIt()).should.equal('no');
      (await fixIt()).should.equal('no');
      mocks.verify();
    });
  })
);
