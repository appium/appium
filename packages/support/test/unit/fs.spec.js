import {fs, tempDir} from '../../lib/index.js';
import path from 'path';
import {createSandbox} from 'sinon';
import {exec} from 'teen_process';
import _ from 'lodash';

// TODO: normalize test organization

const MOCHA_TIMEOUT = 10000;

describe('fs', function () {
  this.timeout(MOCHA_TIMEOUT);

  const existingPath = __filename;

  let sandbox;
  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('mkdir()', function () {
    let dirName = path.resolve(__dirname, 'tmp');

    it('should make a directory that does not exist', async function () {
      await fs.rimraf(dirName);
      await fs.mkdir(dirName);
      let exists = await fs.hasAccess(dirName);
      exists.should.be.true;
    });

    it('should not complain if the dir already exists', async function () {
      let exists = await fs.hasAccess(dirName);
      exists.should.be.true;
      await fs.mkdir(dirName);
    });

    it('should still throw an error if something else goes wrong', async function () {
      await fs.mkdir('/bin/foo').should.be.rejected;
    });
  });

  it('hasAccess()', async function () {
    (await fs.exists(existingPath)).should.be.ok;
    let nonExistingPath = path.resolve(__dirname, 'wrong-specs.js');
    (await fs.hasAccess(nonExistingPath)).should.not.be.ok;
  });

  it('exists()', async function () {
    (await fs.exists(existingPath)).should.be.ok;
    let nonExistingPath = path.resolve(__dirname, 'wrong-specs.js');
    (await fs.exists(nonExistingPath)).should.not.be.ok;
  });

  it('readFile()', async function () {
    (await fs.readFile(existingPath, 'utf8')).should.contain('readFile');
  });

  describe('copyFile()', function () {
    it('should be able to copy a file', async function () {
      let newPath = path.resolve(await tempDir.openDir(), 'fs-specs.js');
      await fs.copyFile(existingPath, newPath);
      (await fs.readFile(newPath, 'utf8')).should.contain('readFile');
    });

    it('should be able to copy a directory');

    it('should throw an error if the source does not exist', async function () {
      await fs.copyFile('/sdfsdfsdfsdf', '/tmp/bla').should.eventually.be.rejected;
    });
  });

  it('rimraf()', async function () {
    let newPath = path.resolve(await tempDir.openDir(), 'fs-specs.js');
    await fs.copyFile(existingPath, newPath);
    (await fs.exists(newPath)).should.be.true;
    await fs.rimraf(newPath);
    (await fs.exists(newPath)).should.be.false;
  });

  it('sanitizeName()', function () {
    fs.sanitizeName(':file?.txt', {
      replacement: '-',
    }).should.eql('-file-.txt');
  });

  it('rimrafSync()', async function () {
    let newPath = path.resolve(await tempDir.openDir(), 'fs-specs.js');
    await fs.copyFile(existingPath, newPath);
    (await fs.exists(newPath)).should.be.true;
    fs.rimrafSync(newPath);
    (await fs.exists(newPath)).should.be.false;
  });

  describe('md5()', function () {
    this.timeout(1200000);
    let smallFilePath;
    let bigFilePath;
    before(async function () {
      // get the path of a small file (this source file)
      smallFilePath = existingPath;

      // create a large file to test, about 163840000 bytes
      bigFilePath = path.resolve(await tempDir.openDir(), 'enormous.txt');
      let file = await fs.open(bigFilePath, 'w');
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
      (await fs.md5(smallFilePath)).should.have.length(32);
    });

    it('should be able to run on huge file', async function () {
      (await fs.md5(bigFilePath)).should.have.length(32);
    });
  });

  describe('hash()', function () {
    it('should calculate sha1 hash', async function () {
      (await fs.hash(existingPath, 'sha1')).should.have.length(40);
    });
    it('should calculate md5 hash', async function () {
      (await fs.hash(existingPath, 'md5')).should.have.length(32);
    });
  });
  it('stat()', async function () {
    let stat = await fs.stat(existingPath);
    stat.should.have.property('atime');
  });
  describe('which()', function () {
    it('should find correct executable', async function () {
      let systemNpmPath = (await exec('which', ['npm'])).stdout.trim();
      let npmPath = await fs.which('npm');
      npmPath.should.equal(systemNpmPath);
    });
    it('should fail gracefully', async function () {
      await fs.which('something_that_does_not_exist').should.eventually.be.rejected;
    });
  });
  it('glob()', async function () {
    let glob = '*.spec.js';
    let tests = await fs.glob(glob, {cwd: __dirname});
    tests.should.be.an('array');
    tests.should.have.length.above(2);
  });

  describe('walkDir()', function () {
    it('walkDir recursive', async function () {
      await chai.expect(fs.walkDir(__dirname, true, (item) => item.endsWith('logger/helpers.js')))
        .to.eventually.not.be.null;
    });
    it('should walk all elements recursive', async function () {
      await chai.expect(fs.walkDir(path.join(__dirname, '..', 'e2e', 'fixture'), true, _.noop)).to
        .eventually.be.null;
    });
    it('should throw error through callback', async function () {
      const err = new Error('Callback error');
      const stub = sandbox.stub().rejects(err);
      await fs.walkDir(__dirname, true, stub).should.eventually.be.rejectedWith(err);
      stub.should.have.been.calledOnce;
    });
    it('should traverse non-recursively', async function () {
      const filePath = await fs.walkDir(__dirname, false, (item) =>
        item.endsWith('logger/helpers.js')
      );
      _.isNil(filePath).should.be.true;
    });
  });

  describe('findRoot()', function () {
    describe('when not provided an argument', function () {
      it('should throw', function () {
        (() => fs.findRoot()).should.throw(TypeError);
      });
    });

    describe('when provided a relative path', function () {
      it('should throw', function () {
        (() => fs.findRoot('./foo')).should.throw(TypeError);
      });
    });

    describe('when provided an empty string', function () {
      it('should throw', function () {
        (() => fs.findRoot('')).should.throw(TypeError);
      });
    });

    describe('when provided an absolute path', function () {
      describe('when the path has a parent `package.json`', function () {
        it('should locate the dir with the closest `package.json`', function () {
          fs.findRoot(__dirname).should.be.a('string');
        });
      });

      describe('when the path does not have a parent `package.json`', function () {
        it('should throw', function () {
          (() => fs.findRoot('/')).should.throw(Error);
        });
      });
    });
  });

  describe('readPackageJsonFrom()', function () {
    describe('when not provided an argument', function () {
      it('should throw', function () {
        (() => fs.readPackageJsonFrom()).should.throw(TypeError, /non-empty, absolute path/);
      });
    });

    describe('when provided a relative path', function () {
      it('should throw', function () {
        (() => fs.readPackageJsonFrom('./foo')).should.throw(TypeError);
      });
    });

    describe('when provided an empty string', function () {
      it('should throw', function () {
        (() => fs.readPackageJsonFrom('')).should.throw(TypeError);
      });
    });

    describe('when provided an absolute path', function () {
      describe('when the path does not have a parent `package.json`', function () {
        it('should throw', function () {
          (() => fs.readPackageJsonFrom('/')).should.throw(Error);
        });
      });

      describe('when the path has a parent `package.json`', function () {
        it('should read the `package.json` found in the root dir', function () {
          fs.readPackageJsonFrom(__dirname).should.be.an('object');
        });
      });
    });
  });
});
