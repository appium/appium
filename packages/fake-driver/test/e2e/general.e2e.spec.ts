import assert from 'node:assert/strict';
import {describe, it, before, after} from 'node:test';

import type {ActionSequence} from '@appium/types';

import {deleteSession, initSession, W3C_PREFIXED_CAPS} from '../helpers';

export function generalTests(context: {port: number}) {
  describe('generic actions', function () {
    let driver: Awaited<ReturnType<typeof initSession>>;

    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS, {port: context.port});
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
      assert.ok(geo.latitude !== undefined && geo.latitude !== null);
      assert.ok(geo.longitude !== undefined && geo.longitude !== null);
    });
    it('should get app source', async function () {
      const source = await driver.getPageSource();
      assert.ok(source.includes('<MockNavBar id="nav"'));
    });
    // TODO do we want to test driver.pageIndex? probably not

    it('should get the orientation', async function () {
      assert.strictEqual(await driver.getOrientation(), 'PORTRAIT');
    });
    it('should set the orientation to something valid', async function () {
      await driver.setOrientation('LANDSCAPE');
      assert.strictEqual(await driver.getOrientation(), 'LANDSCAPE');
    });
    it('should not set the orientation to something invalid', async function () {
      await assert.rejects(driver.setOrientation('INSIDEOUT'), /Orientation must be/);
    });

    it('should get a screenshot', async function () {
      const screenshot = await driver.takeScreenshot();
      assert.match(screenshot, /^iVBOR/);
      assert.ok(screenshot.length > 4000);
    });
    it('should get screen height/width', async function () {
      const {height, width} = await driver.getWindowSize();
      assert.ok(height > 100);
      assert.ok(width > 100);
    });

    it('should set implicit wait timeout', async function () {
      await driver.setTimeout({implicit: 1000});
    });
    it('should not set invalid implicit wait timeout', async function () {
      await assert.rejects(driver.setTimeout({implicit: 'foo' as any}), /values are not valid/);
    });

    // skip these until basedriver supports these timeouts
    it.skip('should set async script timeout', async function () {
      await driver.setTimeout({script: 1000});
    });
    it.skip('should not set invalid async script timeout', async function () {
      await assert.rejects(driver.setTimeout({script: 'foo' as any}), /values are not valid/);
    });

    it.skip('should set page load timeout', async function () {
      await driver.setTimeout({pageLoad: 1000});
    });
    it.skip('should not set page load script timeout', async function () {
      await assert.rejects(driver.setTimeout({pageLoad: 'foo' as any}), /values are not valid/);
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
      const [res] = (await driver.getLogs('actions')) as ActionSequence[][];
      assert.strictEqual(res[0].type, 'pointer');
      assert.strictEqual(res[0].actions.length, 2);
    });

    it('should get and set a fake thing via execute overloads', async function () {
      let thing = await driver.executeScript('fake: getThing', []);
      assert.ok(!thing);
      await driver.executeScript('fake: setThing', [{thing: 1234}]);
      thing = await driver.executeScript('fake: getThing', []);
      assert.strictEqual(thing, 1234);
    });

    it('should add 2 numbers via execute overloads', async function () {
      assert.strictEqual(await driver.executeScript('fake: addition', [{num1: 2, num2: 3}]), 5);
      assert.strictEqual(await driver.executeScript('fake: addition', [{num1: 2, num2: 3, num3: 4}]), 9);
    });

    it('should throw not implemented if an execute overload isnt supported', async function () {
      await assert.rejects(driver.executeScript('fake: blarg', []), /Unsupported execute method/);
    });

    it('should throw an error if a required overload param is missing', async function () {
      await assert.rejects(driver.executeScript('fake: addition', [{num3: 4}]), /required parameters are missing/);
    });

    it('should throw an error if sending in wrong types of params', async function () {
      await assert.rejects(driver.executeScript('fake: addition', [4, 5]), /correct format of arg/);
      await assert.rejects(driver.executeScript('fake: addition', [4]), /not receive an appropriate execute/);
      await assert.rejects(
        driver.executeScript('fake: addition', [{num1: 2}, {extra: 'bad'}]),
        /correct format of arg/,
      );
    });
  });
}
