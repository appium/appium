import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as chai from 'chai';
import {fs, system, tempDir} from '../../lib';
import path from 'node:path';
import {createSandbox} from 'sinon';
import {exec} from 'teen_process';
import _ from 'lodash';

// TODO: normalize test organization

const MOCHA_TIMEOUT = 10000;

describe('fs', function () {
  this.timeout(MOCHA_TIMEOUT);

  const existingPath = __filename;
  let sandbox: ReturnType<typeof createSandbox>;

  before(function () {
    use(chaiAsPromised);
    chai.should();
  });

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('mkdir()', function () {
    const dirName = path.resolve(__dirname, 'tmp');

    it('should make a directory that does not exist', async function () {
      await fs.rimraf(dirName);
      await fs.mkdir(dirName);
      const exists = await fs.hasAccess(dirName);
      expect(exists).to.be.true;
    });

    it('should not complain if the dir already exists', async function () {
      const exists = await fs.hasAccess(dirName);
      expect(exists).to.be.true;
      await fs.mkdir(dirName);
    });

    it('should still throw an error if something else goes wrong', async function () {
      await expect(fs.mkdir('/bin/foo')).to.be.rejected;
    });
  });

  it('hasAccess()', async function () {
    expect(await fs.exists(existingPath)).to.be.ok;
    const nonExistingPath = path.resolve(__dirname, 'wrong-specs.js');
    expect(await fs.hasAccess(nonExistingPath)).to.not.be.ok;
  });

  it('exists()', async function () {
    expect(await fs.exists(existingPath)).to.be.ok;
    const nonExistingPath = path.resolve(__dirname, 'wrong-specs.js');
    expect(await fs.exists(nonExistingPath)).to.not.be.ok;
  });

  it('readFile()', async function () {
    expect(await fs.readFile(existingPath, 'utf8')).to.contain('readFile');
  });

  describe('copyFile()', function () {
    it('should be able to copy a file', async function () {
      const newPath = path.resolve(await tempDir.openDir(), 'fs-specs.js');
      await fs.copyFile(existingPath, newPath);
      expect(await fs.readFile(newPath, 'utf8')).to.contain('readFile');
    });

    it('should throw an error if the source does not exist', async function () {
      await expect(fs.copyFile('/sdfsdfsdfsdf', '/tmp/bla')).to.eventually.be.rejected;
    });
  });

  it('rimraf()', async function () {
    const newPath = path.resolve(await tempDir.openDir(), 'fs-specs.js');
    await fs.copyFile(existingPath, newPath);
    expect(await fs.exists(newPath)).to.be.true;
    await fs.rimraf(newPath);
    expect(await fs.exists(newPath)).to.be.false;
  });

  it('sanitizeName()', function () {
    expect(
      fs.sanitizeName(':file?.txt', {
        replacement: '-',
      })
    ).to.eql('-file-.txt');
  });

  it('rimrafSync()', async function () {
    const newPath = path.resolve(await tempDir.openDir(), 'fs-specs.js');
    await fs.copyFile(existingPath, newPath);
    expect(await fs.exists(newPath)).to.be.true;
    fs.rimrafSync(newPath);
    expect(await fs.exists(newPath)).to.be.false;
  });

  describe('md5()', function () {
    this.timeout(1200000);
    let smallFilePath: string;
    let bigFilePath: string;
    before(async function () {
      smallFilePath = existingPath;
      bigFilePath = path.resolve(await tempDir.openDir(), 'enormous.txt');
      const file = await fs.open(bigFilePath, 'w');
      let fileData = '';
      for (let i = 0; i < 4096; i++) {
        fileData += '1';
      }
      for (let i = 0; i < 40000; i++) {
        await fs.write(file, fileData);
      }
      await fs.close(file);
    });
    after(async function () {
      await fs.unlink(bigFilePath);
    });
    it('should calculate hash of correct length', async function () {
      expect(await fs.md5(smallFilePath)).to.have.length(32);
    });

    it('should be able to run on huge file', async function () {
      expect(await fs.md5(bigFilePath)).to.have.length(32);
    });
  });

  describe('hash()', function () {
    it('should calculate sha1 hash', async function () {
      expect(await fs.hash(existingPath, 'sha1')).to.have.length(40);
    });
    it('should calculate md5 hash', async function () {
      expect(await fs.hash(existingPath, 'md5')).to.have.length(32);
    });
  });
  it('stat()', async function () {
    const stat = await fs.stat(existingPath);
    expect(stat).to.have.property('atime');
  });
  describe('which()', function () {
    before(function () {
      if (system.isWindows()) {
        return this.skip();
      }
    });
    it('should find correct executable', async function () {
      const systemNpmPath = (await exec('which', ['npm'])).stdout.trim();
      const npmPath = await fs.which('npm');
      expect(npmPath).to.equal(systemNpmPath);
    });
    it('should fail gracefully', async function () {
      await expect(fs.which('something_that_does_not_exist')).to.eventually.be.rejected;
    });
  });
  it('glob()', async function () {
    const glob = '*.spec.ts';
    const tests = await fs.glob(glob, {cwd: __dirname});
    expect(tests).to.be.an('array');
    expect(tests.length).to.be.above(2);
  });

  describe('walkDir()', function () {
    it('walkDir recursive', async function () {
      await expect(
        fs.walkDir(__dirname, true, (item) => item.endsWith(`logger${path.sep}helpers.js`))
      ).to.eventually.not.be.null;
    });
    it('should walk all elements recursive', async function () {
      await expect(
        fs.walkDir(path.join(__dirname, '..', 'e2e', 'fixture'), true, _.noop)
      ).to.eventually.be.null;
    });
    it('should throw error through callback', async function () {
      const err = new Error('Callback error');
      const stub = sandbox.stub().rejects(err);
      await expect(fs.walkDir(__dirname, true, stub)).to.eventually.be.rejectedWith(err);
      expect(stub.calledOnce).to.be.true;
    });
    it('should traverse non-recursively', async function () {
      const filePath = await fs.walkDir(__dirname, false, (item) =>
        item.endsWith('logger/helpers.js')
      );
      expect(_.isNil(filePath)).to.be.true;
    });
  });

  describe('findRoot()', function () {
    describe('when not provided an argument', function () {
      it('should throw', function () {
        expect(() => (fs.findRoot as any)()).to.throw(TypeError);
      });
    });

    describe('when provided a relative path', function () {
      it('should throw', function () {
        expect(() => fs.findRoot('./foo')).to.throw(TypeError);
      });
    });

    describe('when provided an empty string', function () {
      it('should throw', function () {
        expect(() => fs.findRoot('')).to.throw(TypeError);
      });
    });

    describe('when provided an absolute path', function () {
      describe('when the path has a parent `package.json`', function () {
        it('should locate the dir with the closest `package.json`', function () {
          expect(fs.findRoot(__dirname)).to.be.a('string');
        });
      });

      describe('when the path does not have a parent `package.json`', function () {
        it('should throw', function () {
          expect(() => fs.findRoot('/')).to.throw(Error);
        });
      });
    });
  });

  describe('readPackageJsonFrom()', function () {
    describe('when not provided an argument', function () {
      it('should throw', function () {
        expect(() => (fs.readPackageJsonFrom as any)()).to.throw(TypeError, /non-empty, absolute path/);
      });
    });

    describe('when provided a relative path', function () {
      it('should throw', function () {
        expect(() => fs.readPackageJsonFrom('./foo')).to.throw(TypeError);
      });
    });

    describe('when provided an empty string', function () {
      it('should throw', function () {
        expect(() => fs.readPackageJsonFrom('')).to.throw(TypeError);
      });
    });

    describe('when provided an absolute path', function () {
      describe('when the path does not have a parent `package.json`', function () {
        it('should throw', function () {
          expect(() => fs.readPackageJsonFrom('/')).to.throw(Error);
        });
      });

      describe('when the path has a parent `package.json`', function () {
        it('should read the `package.json` found in the root dir', function () {
          expect(fs.readPackageJsonFrom(__dirname)).to.be.an('object');
        });
      });
    });
  });
});
