import imagesCommands from '../../../lib/basedriver/commands/images';
import chai from 'chai';

chai.should();

describe('images comparison', function () {
  it('should throw an error if comparison mode is not supported', async function () {
    await imagesCommands.compareImages('some mode', '', '').should.eventually.be.rejectedWith(/comparison mode is unknown/);
  });
});
