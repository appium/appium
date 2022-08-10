import chaiWebdriverIOAsync from 'chai-webdriverio-async';
import {initSession, deleteSession, W3C_PREFIXED_CAPS} from '../helpers';

function generalTests() {
  describe('generic actions', function () {
    let driver;

    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS);
      chai.use(chaiWebdriverIOAsync(driver));
    });

    after(async function () {
      return await deleteSession(driver);
    });

    it.skip('should set geolocation', async function () {
      // TODO unquarantine when WD fixes what it sends the server
      await driver.setGeoLocation(-30, 30);
    });
    it('should get geolocation', async function () {
      let geo = await driver.getGeoLocation();
      should.exist(geo.latitude);
      should.exist(geo.longitude);
    });
    it('should get app source', async function () {
      let source = await driver.getPageSource();
      source.should.contain('<MockNavBar id="nav"');
    });
    // TODO do we want to test driver.pageIndex? probably not

    it('should get the orientation', async function () {
      (await driver.getOrientation()).should.equal('PORTRAIT');
    });
    it('should set the orientation to something valid', async function () {
      await driver.setOrientation('LANDSCAPE');
      (await driver.getOrientation()).should.equal('LANDSCAPE');
    });
    it('should not set the orientation to something invalid', async function () {
      await driver
        .setOrientation('INSIDEOUT')
        .should.eventually.be.rejectedWith(/Orientation must be/);
    });

    it('should get a screenshot', async function () {
      const screenshot = await driver.takeScreenshot();
      screenshot.should.match(/^iVBOR/);
      screenshot.should.have.length.above(4000);
    });
    it('should get screen height/width', async function () {
      const {height, width} = await driver.getWindowSize();
      height.should.be.above(100);
      width.should.be.above(100);
    });

    it('should set implicit wait timeout', async function () {
      await driver.setTimeout({implicit: 1000});
    });
    it('should not set invalid implicit wait timeout', async function () {
      await driver
        .setTimeout({implicit: 'foo'})
        .should.eventually.be.rejectedWith(/values are not valid/);
    });

    // skip these until basedriver supports these timeouts
    it.skip('should set async script timeout', async function () {
      await driver.setTimeout({script: 1000});
    });
    it.skip('should not set invalid async script timeout', async function () {
      await driver
        .setTimeout({script: 'foo'})
        .should.eventually.be.rejectedWith(/values are not valid/);
    });

    it.skip('should set page load timeout', async function () {
      await driver.setTimeout({pageLoad: 1000});
    });
    it.skip('should not set page load script timeout', async function () {
      await driver
        .setTimeout({pageLoad: 'foo'})
        .should.eventually.be.rejectedWith(/values are not valid/);
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
      res[0].type.should.eql('pointer');
      res[0].actions.should.have.length(2);
    });

    it('should get and set a fake thing via execute overloads', async function () {
      let thing = await driver.executeScript('fake: getThing', []);
      should.not.exist(thing);
      await driver.executeScript('fake: setThing', [{thing: 1234}]);
      thing = await driver.executeScript('fake: getThing', []);
      thing.should.eql(1234);
    });

    it('should add 2 numbers via execute overloads', async function () {
      await driver.executeScript('fake: addition', [{num1: 2, num2: 3}]).should.eventually.eql(5);
      await driver
        .executeScript('fake: addition', [{num1: 2, num2: 3, num3: 4}])
        .should.eventually.eql(9);
    });

    it('should throw not implemented if an execute overload isnt supported', async function () {
      await driver
        .executeScript('fake: blarg', [])
        .should.be.rejectedWith(/Unsupported execute method/);
    });

    it('should throw an error if a required overload param is missing', async function () {
      await driver
        .executeScript('fake: addition', [{num3: 4}])
        .should.be.rejectedWith(/Parameters were incorrect/);
    });

    it('should throw an error if sending in wrong types of params', async function () {
      await driver
        .executeScript('fake: addition', [4, 5])
        .should.be.rejectedWith(/correct format of arg/);
      await driver
        .executeScript('fake: addition', [4])
        .should.be.rejectedWith(/not receive an appropriate execute/);
      await driver
        .executeScript('fake: addition', [{num1: 2}, {extra: 'bad'}])
        .should.be.rejectedWith(/correct format of arg/);
    });
  });
}

export default generalTests;
