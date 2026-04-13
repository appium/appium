import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {checkNodeOk, requireDir} from '../../../lib/bootstrap/node-helpers';

const {expect} = chai;
chai.use(chaiAsPromised);

describe('bootstrap/node-helpers', function () {
  describe('checkNodeOk()', function () {
    const _process = process;

    before(function () {
      process = {...process}; // eslint-disable-line no-global-assign
    });

    after(function () {
      process = _process; // eslint-disable-line no-global-assign
    });

    describe('unsupported nodes', function () {
      const unsupportedVersions = [
        'v0.1',
        'v0.9.12',
        'v0.10.36',
        'v0.12.14',
        'v4.4.7',
        'v5.7.0',
        'v6.3.1',
        'v7.1.1',
        'v8.0.0',
        'v9.2.3',
        'v10.1.0',
        'v11.0.0',
        'v12.0.0',
        'v14.0.0',
        'v14.17.0',
        'v14.17.5',
        'v16.0.0',
        'v20.18.0',
        'v22.10.0',
      ];

      for (const version of unsupportedVersions) {
        it(`should fail if node is ${version}`, function () {
          // @ts-expect-error
          process.version = version;
          expect(checkNodeOk).to.throw();
        });
      }
    });

    describe('supported nodes', function () {
      it('should succeed if node is ^20.19.0', function () {
        // @ts-expect-error
        process.version = 'v20.19.0';
        expect(checkNodeOk).to.not.throw();
        // @ts-expect-error
        process.version = 'v20.100.0';
        expect(checkNodeOk).to.not.throw();
      });

      it('should succeed if node is 22.12+', function () {
        // @ts-expect-error
        process.version = 'v22.12.0';
        expect(checkNodeOk).to.not.throw();
        // @ts-expect-error
        process.version = 'v100.0.0';
        expect(checkNodeOk).to.not.throw();
      });
    });
  });

  describe('requireDir()', function () {
    it('should fail to use a dir with incorrect permissions', async function () {
      await expect(requireDir('/private/if_you_run_with_sudo_this_wont_fail')).to.be.rejectedWith(
        /must exist/
      );
    });

    it('should fail to use an undefined dir', async function () {
      // @ts-expect-error
      await expect(requireDir()).to.be.rejectedWith(/must exist/);
    });

    it('should fail to use a non-writeable dir', async function () {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appium-requireDir-test-'));
      try {
        await fs.chmod(tempDir, 0o444);
        await expect(requireDir(tempDir)).to.be.rejectedWith(/must be writeable/);
      } finally {
        await fs.chmod(tempDir, 0o700);
        await fs.rmdir(tempDir);
      }
    });

    it('should be able to use a dir with correct permissions', async function () {
      await expect(requireDir('/tmp/test_tmp_dir/with/any/number/of/levels')).to.not.be.rejected;
    });
  });
});
