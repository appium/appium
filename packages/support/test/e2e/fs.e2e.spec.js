import {fs} from '../../lib/fs';
import {openDir} from '../../lib/tempdir';
import {isWindows} from '../../lib/system';
import path from 'node:path';

describe('fs', function () {
  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });

  describe('mv()', function () {
    let srcRoot;
    let dstRoot;

    beforeEach(async function () {
      srcRoot = await openDir();
      dstRoot = await openDir();
    });

    afterEach(async function () {
      await Promise.all([srcRoot, dstRoot].map((p) => fs.rimraf(p)));
      srcRoot = dstRoot = undefined;
    });

    it('should move file', async function () {
      const srcPath = path.join(srcRoot, 'src.file');
      await fs.writeFile(srcPath, Buffer.from('bar'));
      const dstPath = path.join(dstRoot, path.basename(srcPath));
      await fs.mv(srcPath, dstPath);
      (await fs.exists(path.join(dstRoot, path.basename(srcPath)))).should.be.true;
      (await fs.exists(path.join(srcRoot, path.basename(srcPath)))).should.be.false;
    });

    it('should move folder', async function () {
      const srcPath = path.join(srcRoot, 'foo', 'src.file');
      await fs.mkdirp(path.dirname(srcPath));
      await fs.writeFile(srcPath, Buffer.from('bar'));
      await fs.mv(srcRoot, dstRoot, {mkdirp: true});
      (await fs.exists(
        path.join(dstRoot, path.basename(path.dirname(srcPath)))
      )).should.be.true;
      (await fs.exists(
        path.join(dstRoot, path.basename(path.dirname(srcPath)), path.basename(srcPath))
      )).should.be.true;
      (await fs.exists(
        path.join(srcRoot, path.basename(path.dirname(srcPath)))
      )).should.be.false;
    });

    it('should fail if source path does not exist', async function () {
      const srcPath = path.join(srcRoot, 'src.file');
      const dstPath = path.join(dstRoot, path.basename(srcPath));
      await fs.mv(srcPath, dstPath).should.eventually.be.rejected;
    });

    it('should fail if destination path already exists and clobber is disabled', async function () {
      const srcPath = path.join(srcRoot, 'src.file');
      await fs.writeFile(srcPath, Buffer.from('bar'));
      const dstPath = path.join(dstRoot, path.basename(srcPath));
      await fs.writeFile(dstPath, Buffer.from('foo'));
      await fs.mv(srcPath, dstPath, {clobber: false}).should.eventually.be.rejected;
      (await fs.readFile(dstPath)).toString().should.eql('foo');
    });

    it('should override a file if already exists by default', async function () {
      const srcPath = path.join(srcRoot, 'src.file');
      await fs.writeFile(srcPath, Buffer.from('bar'));
      const dstPath = path.join(dstRoot, path.basename(srcPath));
      await fs.writeFile(dstPath, Buffer.from('foo'));
      await fs.mv(srcPath, dstPath);
      (await fs.readFile(dstPath)).toString().should.eql('bar');
    });
  });

  describe('isExecutable()', function () {
    describe('when the path does not exist', function () {
      it('should return `false`', async function () {
        await fs.isExecutable('/path/to/nowhere').should.eventually.be.false;
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
          await fs.isExecutable(__filename).should.eventually.be.false;
        });
      });

      describe('when the path is executable', function () {
        it('should return `true`', async function () {
          await fs.isExecutable('/bin/bash').should.eventually.be.true;
        });
      });
    });

    describe('when the parameter is not a path', function () {
      it('should return `false`', async function () {
        await fs.isExecutable().should.eventually.be.false;
      });
    });
  });

});
