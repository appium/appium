import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {tempDir, fs} from '../../lib';

describe('tempdir', function () {
  before(function () {
    use(chaiAsPromised);
  });

  afterEach(function () {
    delete process.env.APPIUM_TMP_DIR;
  });

  it('should be able to generate a path', async function () {
    const path = await tempDir.path({prefix: 'myfile', suffix: '.tmp'});
    expect(path).to.exist;
    expect(path).to.include('myfile.tmp');
  });

  it('should be able to generate a path with process.env.APPIUM_TMP_DIR', async function () {
    const preRootDirPath = await tempDir.openDir();
    process.env.APPIUM_TMP_DIR = preRootDirPath;

    const path = await tempDir.path({prefix: 'myfile', suffix: '.tmp'});
    expect(path).to.exist;
    expect(path).to.include(preRootDirPath);
    expect(path).to.include('myfile.tmp');
  });

  it('should be able to create a temp file', async function () {
    const res = await tempDir.open({prefix: 'my-test-file', suffix: '.zip'});
    expect(res).to.exist;
    expect(res.path).to.exist;
    expect(res.path).to.include('my-test-file.zip');
    expect(res.fd).to.exist;
    await expect(fs.exists(res.path)).to.eventually.be.ok;
  });

  it('should be able to create a temp file with process.env.APPIUM_TMP_DIR', async function () {
    const preRootDirPath = await tempDir.openDir();
    process.env.APPIUM_TMP_DIR = preRootDirPath;

    const res = await tempDir.open({prefix: 'my-test-file', suffix: '.zip'});
    expect(res).to.exist;
    expect(res.path).to.exist;
    expect(res.path).to.include(preRootDirPath);
    expect(res.path).to.include('my-test-file.zip');
    expect(res.fd).to.exist;
    await expect(fs.exists(res.path)).to.eventually.be.ok;
  });

  it('should generate a random temp dir', async function () {
    const res = await tempDir.openDir();
    expect(res).to.be.a('string');
    await expect(fs.exists(res)).to.eventually.be.ok;
    const res2 = await tempDir.openDir();
    await expect(fs.exists(res2)).to.eventually.be.ok;
    expect(res).to.not.equal(res2);
  });

  it('should generate a random temp dir, but the same with process.env.APPIUM_TMP_DIR', async function () {
    const preRootDirPath = await tempDir.openDir();
    process.env.APPIUM_TMP_DIR = preRootDirPath;

    const res = await tempDir.openDir();
    expect(res).to.be.a('string');
    await expect(fs.exists(res)).to.eventually.be.ok;
    const res2 = await tempDir.openDir();
    await expect(fs.exists(res2)).to.eventually.be.ok;
    expect(res).to.include(preRootDirPath);
    expect(res2).to.include(preRootDirPath);
    expect(res).to.not.equal(res2);
  });

  it('should generate one temp dir used for the life of the process', async function () {
    const res = await tempDir.staticDir();
    expect(res).to.be.a('string');
    await expect(fs.exists(res)).to.eventually.be.ok;
    const res2 = await tempDir.staticDir();
    await expect(fs.exists(res2)).to.eventually.be.ok;
    expect(res).to.equal(res2);
  });
});
