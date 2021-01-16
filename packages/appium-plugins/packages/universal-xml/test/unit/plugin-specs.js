import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import UniversalXMLPlugin from '../../index';
import BaseDriver from 'appium-base-driver';

chai.use(chaiAsPromised);
chai.should();

describe('UniversalXMLPlugin#handle', function () {
  const next = () => true;
  const driver = new BaseDriver();
  const p = new UniversalXMLPlugin();
  describe('getPageSource', function () {
    it('should get the page source', async function () {
      await p.handle(next, driver, 'getPageSource').should.eventually.eql(true);
    });
  });
});
