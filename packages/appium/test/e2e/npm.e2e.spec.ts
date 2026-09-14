import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {npm} from '../../lib/utils/index.js';

describe('npm module', function () {
  describe('getLatestVersion()', function () {
    describe('when the package is not published to the public registry', function () {
      it('should not throw', async function () {
        await assert.doesNotReject(
          npm.getLatestVersion(process.cwd(), 'crusher-brush-resize-disfigure-props-desktop-blatancy-prologue'),
        );
      });

      it('should resolve with "null"', async function () {
        assert.strictEqual(
          await npm.getLatestVersion(process.cwd(), 'crusher-brush-resize-disfigure-props-desktop-blatancy-prologue'),
          null,
        );
      });
    });
  });

  describe('getLatestSafeUpgradeVersion()', function () {
    describe('when the package is not published to the public registry', function () {
      it('should not throw', async function () {
        assert.strictEqual(
          await npm.getLatestSafeUpgradeVersion(
            process.cwd(),
            'crusher-brush-resize-disfigure-props-desktop-blatancy-prologue',
            '1.0.0',
          ),
          null,
        );
      });

      it('should resolve with "null"', async function () {
        assert.strictEqual(
          await npm.getLatestSafeUpgradeVersion(
            process.cwd(),
            'crusher-brush-resize-disfigure-props-desktop-blatancy-prologue',
            '1.0.0',
          ),
          null,
        );
      });
    });
  });
});
