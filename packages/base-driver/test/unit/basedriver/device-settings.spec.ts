import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type {SettingsUpdateListener} from '@appium/types';
import {node} from '@appium/support';
import sinon from 'sinon';
import {DeviceSettings, MAX_SETTINGS_SIZE} from '../../../lib/basedriver/device-settings';
import {InvalidArgumentError} from '../../../lib/protocol/errors';

chai.use(chaiAsPromised);

describe('DeviceSettings', function () {
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    describe('when no parameters are provided to the constructor', function () {
      it('should not throw', function () {
        expect(() => new DeviceSettings()).not.to.throw();
      });
    });

    it('should not hold on to reference of defaults in constructor', function () {
      const obj = {foo: 'bar'};
      const d1 = new DeviceSettings(obj);
      const d2 = new DeviceSettings(obj);
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
          await expect(
            (deviceSettings.update as (newSettings?: Record<string, unknown>) => Promise<void>)()
          ).to.be.rejectedWith(
            InvalidArgumentError,
            /with valid JSON/i
          );
        });
      });

      describe('when a non-plain-object `newSettings` param is provided', function () {
        it('should reject with an InvalidArgumentError', async function () {
          const deviceSettings = new DeviceSettings();
          await expect(
            deviceSettings.update(null as unknown as Record<string, unknown>)
          ).to.be.rejectedWith(
            InvalidArgumentError,
            /with valid JSON/i
          );
        });
      });

      describe('when the size of the `newSettings` param exceeds `MAX_SETTINGS_SIZE`', function () {
        beforeEach(function () {
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
        let onSettingsUpdate: sinon.SinonStub;

        beforeEach(function () {
          onSettingsUpdate = sandbox.stub();
        });

        describe('when the new settings do not differ', function () {
          it('should not call the `_onSettingsUpdate` listener', async function () {
            const deviceSettings = new DeviceSettings(
              {stuff: 'things'},
              onSettingsUpdate as SettingsUpdateListener<Record<string, unknown>>
            );
            await deviceSettings.update({stuff: 'things'});
            expect(onSettingsUpdate.called).to.be.false;
          });
        });

        describe('when the new settings differ', function () {
          it('should call the `_onSettingsUpdate` listener', async function () {
            const deviceSettings = new DeviceSettings(
              {},
              onSettingsUpdate as SettingsUpdateListener<Record<string, unknown>>
            );
            await deviceSettings.update({stuff: 'things'});
            expect(
              onSettingsUpdate.calledOnceWithExactly('stuff', 'things', undefined)
            ).to.be.true;
          });
        });
      });
    });
  });
});
