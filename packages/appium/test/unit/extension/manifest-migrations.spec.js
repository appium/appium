import {Manifest} from '../../../lib/extension/manifest';
import {migrate} from '../../../lib/extension/manifest-migrations';
import {DRIVER_TYPE} from '../../../lib/constants';

describe('manifest-migrations', function () {
  let expect;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    expect = chai.expect;
  });

  describe('when no installPath property present in manifest', function () {
    it('should trigger refresh', async function () {
      const manifest = Manifest.getInstance(process.cwd());
      // do not explicitly set the schema rev lower here, since that will trigger
      manifest.setExtension(
        DRIVER_TYPE,
        'derp',
        // @ts-expect-error - old manifest version
        {
          version: '1.0.0',
          automationName: 'Derp',
          mainClass: 'SomeClass',
          pkgName: 'derp',
          platformNames: ['dogs', 'cats'],
          installSpec: 'derp',
          installType: 'local',
          appiumVersion: '2.0.0',
        }
      );

      await expect(migrate(manifest)).to.eventually.be.true;
    });
  });

  describe('when installPath property present in manifest', function () {
    it('should not trigger refresh', async function () {
      const manifest = Manifest.getInstance(process.cwd());
      // do not explicitly set the schema rev lower here, since that will trigger
      manifest.setExtension(DRIVER_TYPE, 'derp', {
        version: '1.0.0',
        automationName: 'Derp',
        mainClass: 'SomeClass',
        pkgName: 'derp',
        platformNames: ['dogs', 'cats'],
        installPath: '/path/to/thing',
        installType: 'local',
        installSpec: 'derp',
        appiumVersion: '2.0.0',
      });

      await expect(migrate(manifest)).to.eventually.be.false;
    });
  });

  describe('when an installType is "npm" and the rev is old', function () {
    it('should trigger refresh', async function () {
      const manifest = Manifest.getInstance(process.cwd());
      manifest.setSchemaRev(3); // this will trigger a refresh, but there's no way to tell _why_, which may be bad. YAGNI?
      manifest.setExtension(DRIVER_TYPE, 'derp', {
        version: '1.0.0',
        automationName: 'Derp',
        mainClass: 'SomeClass',
        pkgName: 'derp',
        platformNames: ['dogs', 'cats'],
        installType: 'npm',
        installPath: '/path/to/thing',
        installSpec: 'derp',
        appiumVersion: '2.0.0',
      });

      await expect(migrate(manifest)).to.eventually.be.true;
    });
  });

  describe('when no installType is "npm"', function () {
    it('should not trigger refresh', async function () {
      const manifest = Manifest.getInstance(process.cwd());
      // do not explicitly set the schema rev lower here, since that will trigger
      manifest.setExtension(DRIVER_TYPE, 'derp', {
        version: '1.0.0',
        automationName: 'Derp',
        mainClass: 'SomeClass',
        pkgName: 'derp',
        platformNames: ['dogs', 'cats'],
        installType: 'local',
        installPath: '/path/to/thing',
        installSpec: 'derp',
        appiumVersion: '2.0.0',
      });

      await expect(migrate(manifest)).to.eventually.be.false;
    });
  });
});
