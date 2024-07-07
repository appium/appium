import {npm} from '../../lib/npm';

describe('npm module', function () {
  let expect;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    expect = chai.expect;
  });

  describe('getLatestVersion()', function () {
    describe('when the package is not published to the public registry', function () {
      it('should not throw', async function () {
        await expect(
          npm.getLatestVersion(
            process.cwd(),
            'crusher-brush-resize-disfigure-props-desktop-blatancy-prologue'
          )
        ).not.to.be.rejected;
      });

      it('should resolve with "null"', async function () {
        await expect(
          npm.getLatestVersion(
            process.cwd(),
            'crusher-brush-resize-disfigure-props-desktop-blatancy-prologue'
          )
        ).to.eventually.be.null;
      });
    });
  });

  describe('getLatestSafeUpgradeVersion()', function () {
    describe('when the package is not published to the public registry', function () {
      it('should not throw', async function () {
        await expect(
          npm.getLatestSafeUpgradeVersion(
            process.cwd(),
            'crusher-brush-resize-disfigure-props-desktop-blatancy-prologue',
            '1.0.0'
          )
        ).to.eventually.be.null;
      });

      it('should resolve with "null"', async function () {
        await expect(
          npm.getLatestSafeUpgradeVersion(
            process.cwd(),
            'crusher-brush-resize-disfigure-props-desktop-blatancy-prologue',
            '1.0.0'
          )
        ).to.eventually.be.null;
      });
    });
  });
});
