import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {initSession, deleteSession, W3C_PREFIXED_CAPS} from '../helpers';

chai.use(chaiAsPromised);

export function generalTests() {
  describe('generic actions', function () {
    let driver: Awaited<ReturnType<typeof initSession>>;

    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS);
    });

    after(async function () {
      return await deleteSession(driver);
    });

    it.skip('should set geolocation', async function () {
      // TODO unquarantine when WD fixes what it sends the server
      await driver.setGeoLocation({latitude: -30, longitude: 30});
    });
    it('should get geolocation', async function () {
      const geo = await driver.getGeoLocation();
      expect(geo.latitude).to.exist;
      expect(geo.longitude).to.exist;
    });
    it('should get app source', async function () {
      const source = await driver.getPageSource();
      expect(source).to.contain('<MockNavBar id="nav"');
    });
    // TODO do we want to test driver.pageIndex? probably not

    it('should get the orientation', async function () {
      expect(await driver.getOrientation()).to.equal('PORTRAIT');
    });
    it('should set the orientation to something valid', async function () {
      await driver.setOrientation('LANDSCAPE');
      expect(await driver.getOrientation()).to.equal('LANDSCAPE');
    });
    it('should not set the orientation to something invalid', async function () {
      await expect(driver.setOrientation('INSIDEOUT')).to.be.rejectedWith(/Orientation must be/);
    });

    it('should get a screenshot', async function () {
      const screenshot = await driver.takeScreenshot();
      expect(screenshot).to.match(/^iVBOR/);
      expect(screenshot).to.have.length.above(4000);
    });
    it('should get screen height/width', async function () {
      const {height, width} = await driver.getWindowSize();
      expect(height).to.be.above(100);
      expect(width).to.be.above(100);
    });

    it('should set implicit wait timeout', async function () {
      await driver.setTimeout({implicit: 1000});
    });
    it('should not set invalid implicit wait timeout', async function () {
      await expect(driver.setTimeout({implicit: 'foo' as any})).to.be.rejectedWith(
        /values are not valid/
      );
    });

    // skip these until basedriver supports these timeouts
    it.skip('should set async script timeout', async function () {
      await driver.setTimeout({script: 1000});
    });
    it.skip('should not set invalid async script timeout', async function () {
      await expect(driver.setTimeout({script: 'foo' as any})).to.be.rejectedWith(
        /values are not valid/
      );
    });

    it.skip('should set page load timeout', async function () {
      await driver.setTimeout({pageLoad: 1000});
    });
    it.skip('should not set page load script timeout', async function () {
      await expect(driver.setTimeout({pageLoad: 'foo' as any})).to.be.rejectedWith(
        /values are not valid/
      );
    });

    it('should allow performing actions that do nothing but save them', async function () {
      const actions = [
        {
          type: 'pointer',
          id: 'finger1',
          parameters: {
            pointerType: 'touch',
          },
          actions: [
            {
              type: 'pointerDown',
              button: 0,
            },
            {
              type: 'pointerUp',
              button: 0,
            },
          ],
        },
      ];
      await driver.performActions(actions);
      const [res] = await driver.getLogs('actions');
      expect(res[0].type).to.eql('pointer');
      expect(res[0].actions).to.have.length(2);
    });

    it('should get and set a fake thing via execute overloads', async function () {
      let thing = await driver.executeScript('fake: getThing', []);
      expect(thing).to.not.exist;
      await driver.executeScript('fake: setThing', [{thing: 1234}]);
      thing = await driver.executeScript('fake: getThing', []);
      expect(thing).to.eql(1234);
    });

    it('should add 2 numbers via execute overloads', async function () {
      await expect(
        driver.executeScript('fake: addition', [{num1: 2, num2: 3}])
      ).to.eventually.eql(5);
      await expect(
        driver.executeScript('fake: addition', [{num1: 2, num2: 3, num3: 4}])
      ).to.eventually.eql(9);
    });

    it('should throw not implemented if an execute overload isnt supported', async function () {
      await expect(driver.executeScript('fake: blarg', [])).to.be.rejectedWith(
        /Unsupported execute method/
      );
    });

    it('should throw an error if a required overload param is missing', async function () {
      await expect(
        driver.executeScript('fake: addition', [{num3: 4}])
      ).to.be.rejectedWith(/required parameters are missing/);
    });

    it('should throw an error if sending in wrong types of params', async function () {
      await expect(driver.executeScript('fake: addition', [4, 5])).to.be.rejectedWith(
        /correct format of arg/
      );
      await expect(driver.executeScript('fake: addition', [4])).to.be.rejectedWith(
        /not receive an appropriate execute/
      );
      await expect(
        driver.executeScript('fake: addition', [{num1: 2}, {extra: 'bad'}])
      ).to.be.rejectedWith(/correct format of arg/);
    });
  });
}
