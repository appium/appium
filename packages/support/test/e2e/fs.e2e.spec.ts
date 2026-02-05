import path from 'node:path';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as chai from 'chai';
import {fs} from '../../lib/fs';
import {openDir} from '../../lib/tempdir';
import {isWindows} from '../../lib/system';

describe('fs', function () {
  before(async function () {
    use(chaiAsPromised);
    chai.should();
  });

  describe('mv()', function () {
    let srcRoot: string | undefined;
    let dstRoot: string | undefined;

    beforeEach(async function () {
      srcRoot = await openDir();
      dstRoot = await openDir();
    });

    afterEach(async function () {
      await Promise.all(
        [srcRoot, dstRoot].filter((p): p is string => p != null).map((p) => fs.rimraf(p))
      );
      srcRoot = dstRoot = undefined;
    });

    it('should move file', async function () {
      const srcPath = path.join(srcRoot!, 'src.file');
      await fs.writeFile(srcPath, Buffer.from('bar'));
      const dstPath = path.join(dstRoot!, path.basename(srcPath));
      await fs.mv(srcPath, dstPath);
      expect(await fs.exists(path.join(dstRoot!, path.basename(srcPath)))).to.be.true;
      expect(await fs.exists(path.join(srcRoot!, path.basename(srcPath)))).to.be.false;
    });

    it('should move folder', async function () {
      const srcPath = path.join(srcRoot!, 'foo', 'src.file');
      await fs.mkdirp(path.dirname(srcPath));
      await fs.writeFile(srcPath, Buffer.from('bar'));
      await fs.mv(srcRoot!, dstRoot!, {mkdirp: true});
      expect(
        await fs.exists(path.join(dstRoot!, path.basename(path.dirname(srcPath))))
      ).to.be.true;
      expect(
        await fs.exists(
          path.join(dstRoot!, path.basename(path.dirname(srcPath)), path.basename(srcPath))
        )
      ).to.be.true;
      expect(
        await fs.exists(path.join(srcRoot!, path.basename(path.dirname(srcPath))))
      ).to.be.false;
    });

    it('should fail if source path does not exist', async function () {
      const srcPath = path.join(srcRoot!, 'src.file');
      const dstPath = path.join(dstRoot!, path.basename(srcPath));
      await expect(fs.mv(srcPath, dstPath)).to.eventually.be.rejected;
    });

    it('should fail if destination path already exists and clobber is disabled', async function () {
      const srcPath = path.join(srcRoot!, 'src.file');
      await fs.writeFile(srcPath, Buffer.from('bar'));
      const dstPath = path.join(dstRoot!, path.basename(srcPath));
      await fs.writeFile(dstPath, Buffer.from('foo'));
      await expect(fs.mv(srcPath, dstPath, {clobber: false})).to.eventually.be.rejected;
      expect((await fs.readFile(dstPath)).toString()).to.eql('foo');
    });

    it('should override a file if already exists by default', async function () {
      const srcPath = path.join(srcRoot!, 'src.file');
      await fs.writeFile(srcPath, Buffer.from('bar'));
      const dstPath = path.join(dstRoot!, path.basename(srcPath));
      await fs.writeFile(dstPath, Buffer.from('foo'));
      await fs.mv(srcPath, dstPath);
      expect((await fs.readFile(dstPath)).toString()).to.eql('bar');
    });

    it('should handle cross-device move by falling back to copy-and-delete', async function () {
      const srcPath = path.join(srcRoot!, 'src.file');
      await fs.writeFile(srcPath, Buffer.from('bar'));
      const dstPath = path.join(dstRoot!, path.basename(srcPath));

      const originalRename = fs.rename;
      (fs as {rename: typeof fs.rename}).rename = async () => {
        const err = new Error('cross-device link not permitted') as NodeJS.ErrnoException;
        err.code = 'EXDEV';
        throw err;
      };

      try {
        await fs.mv(srcPath, dstPath);
        expect(await fs.exists(dstPath)).to.be.true;
        expect(await fs.exists(srcPath)).to.be.false;
        expect((await fs.readFile(dstPath)).toString()).to.eql('bar');
      } finally {
        (fs as {rename: typeof fs.rename}).rename = originalRename;
      }
    });
  });

  describe('isExecutable()', function () {
    describe('when the path does not exist', function () {
      it('should return `false`', async function () {
        await expect(fs.isExecutable('/path/to/nowhere')).to.eventually.be.false;
      });
    });

    describe('when the path exists', function () {
      beforeEach(function () {
        if (isWindows()) {
          return this.skip();
        }
      });

      describe('when the path is not executable', function () {
        it('should return `false`', async function () {
          await expect(fs.isExecutable(__filename)).to.eventually.be.false;
        });
      });

      describe('when the path is executable', function () {
        it('should return `true`', async function () {
          await expect(fs.isExecutable('/bin/bash')).to.eventually.be.true;
        });
      });
    });

    describe('when the parameter is not a path', function () {
      it('should return `false`', async function () {
        await expect(fs.isExecutable(undefined as unknown as string)).to.eventually.be.false;
      });
    });
  });
});
