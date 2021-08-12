// transpile:mocha

import { welcome } from '../../lib/express/static';
import sinon from 'sinon';



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
