import {expect} from 'chai';
import {welcome} from '../../../lib/express/static';
import {createSandbox} from 'sinon';

describe('welcome', function () {
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should fill the template', async function () {
    const res = {
      send: sandbox.stub(),
    };
    await welcome({}, res as any);

    expect(res.send.calledOnce).to.be.true;
    expect(res.send.args[0][0]).to.include("Let's browse!");
  });
});
