import {welcome} from '../../../lib/express/static';
// eslint-disable-next-line import/named
import {createSandbox} from 'sinon';

describe('welcome', function () {
  let sandbox;

  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should fill the template', async function () {
    let res = {
      send: sandbox.stub(),
    };
    await welcome({}, res);

    res.send.calledOnce.should.be.true;
    res.send.args[0][0].should.include("Let's browse!");
  });
});
