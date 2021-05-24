// transpile:mocha

import { welcome } from '../../lib/express/static';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';


chai.should();
chai.use(chaiAsPromised);

describe('welcome', function () {
  it('should fill the template', async function () {
    let res = {
      send: sinon.spy()
    };
    await welcome({}, res);

    res.send.calledOnce.should.be.true;
    res.send.args[0][0].should.include('Let\'s browse!');
  });
});
