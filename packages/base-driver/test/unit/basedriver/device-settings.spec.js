import {node} from '@appium/support';
import sinon from 'sinon';
import {DeviceSettings, MAX_SETTINGS_SIZE} from '../../../lib/basedriver/device-settings';
import {InvalidArgumentError} from '../../../lib/protocol/errors';

const {expect} = chai;

describe('DeviceSettings', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    describe('when no parameteres are provided to the constructor', function () {
      it('should not throw', function () {
        expect(() => new DeviceSettings()).not.to.throw();
      });
    });

    it('should not hold on to reference of defaults in constructor', function () {
      let obj = {foo: 'bar'};
      let d1 = new DeviceSettings(obj);
      let d2 = new DeviceSettings(obj);
      d1.getSettings().foo = 'baz';
      expect(d1.getSettings()).to.not.eql(d2.getSettings());
    });
  });

  describe('instance method', function () {
    describe('getSettings()', function () {
      it('should return a clone of the internal settings object', function () {
        const settings = {
          foo: 'bar',
          bar: 'foo',
        };
        const deviceSettings = new DeviceSettings(settings);
        expect(deviceSettings.getSettings()).to.eql(settings);
      });
    });

    describe('update()', function () {
      describe('when no parameters are provided', function () {
        it('should reject with an InvalidArgumentError', async function () {
          const deviceSettings = new DeviceSettings();
          await expect(deviceSettings.update()).to.be.rejectedWith(
            InvalidArgumentError,
            /with valid JSON/i
          );
        });
      });

      describe('when a non-plain-object `newSettings` param is provided', function () {
        it('should reject with an InvalidArgumentError', async function () {
          const deviceSettings = new DeviceSettings();
          await expect(deviceSettings.update(null)).to.be.rejectedWith(
            InvalidArgumentError,
            /with valid JSON/i
          );
        });
      });

      describe('when the size of the `newSettings` param exceeds `MAX_SETTINGS_SIZE`', function () {
        beforeEach(function () {
          // this is easier than sending a 21MB object
          sandbox.stub(node, 'getObjectSize').returns(MAX_SETTINGS_SIZE + 1);
        });

        it('should reject with an InvalidArgumentError', async function () {
          const deviceSettings = new DeviceSettings();
          await expect(deviceSettings.update({stuff: 'things'})).to.be.rejectedWith(
            InvalidArgumentError,
            /object size exceeds/i
          );
        });
      });

      describe('when the `newSettings` param is valid', function () {
        let onSettingsUpdate;

        beforeEach(function () {
          onSettingsUpdate = sandbox.stub();
        });

        describe('when the new settings do not differ', function () {
          it('should not call the `_onSettingsUpdate` listener', async function () {
            const deviceSettings = new DeviceSettings({stuff: 'things'}, onSettingsUpdate);
            await deviceSettings.update({stuff: 'things'});
            expect(onSettingsUpdate).not.to.have.been.called;
          });
        });

        describe('when the new settings differ', function () {
          it('should call the `_onSettingsUpdate` listener', async function () {
            const deviceSettings = new DeviceSettings({}, onSettingsUpdate);
            await deviceSettings.update({stuff: 'things'});
            expect(onSettingsUpdate).to.have.been.calledOnceWithExactly(
              'stuff',
              'things',
              undefined
            );
          });
        });
      });
    });
  });
});
