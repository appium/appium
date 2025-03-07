import _ from 'lodash';
import { Storage } from '../../lib/storage';
import { tempDir, fs, logger } from '@appium/support';
import path from 'node:path';

const log = logger.getLogger();

describe('storage', function () {
  /** @type {string | undefined} */
  let tmpRoot;
  /** @type {Storage | undefined | null} */
  let storage;
  /** @type {string | undefined | null} */
  let storageRoot;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    tmpRoot = await tempDir.openDir();
  });

  after(async function () {
    if (tmpRoot && await fs.exists(tmpRoot)) {
      await fs.rimraf(tmpRoot);
    }
  });

  beforeEach(async function () {
    storageRoot = await tempDir.openDir();
  });

  afterEach(async function () {
    if (storage) {
      await storage.reset();
      storage = null;
    }
    if (storageRoot && await fs.exists(storageRoot)) {
      await fs.rimraf(storageRoot);
      storageRoot = null;
    }
  });

  it('should be initially empty', async function () {
    storage = new Storage(storageRoot, false, false, log);
    const files = await storage.list();
    _.isEmpty(files).should.be.true;
    (await storage.delete('foo')).should.be.false;
  });

  it('should only reset known files', async function () {
    const name = 'foo.bar';
    await fs.writeFile(path.join(storageRoot, name), Buffer.alloc(1));
    storage = new Storage(storageRoot, true, false, log);
    const files = await storage.list();
    _.isEmpty(files).should.be.true;
    (await storage.delete(name)).should.be.false;
    await storage.reset();
    (await fs.exists(path.join(storageRoot, name))).should.be.true;
  });

  it('should perform basic operations', async function () {
    storage = new Storage(storageRoot, false, false, log);
    const name = 'foo.bar';
    const size = 1 * 1024 * 1024;
    await addFileToStorage(name, size);
    let files = await storage.list();
    _.isEmpty(files).should.be.false;
    files[0].name.should.eql(name);
    files[0].size.should.eql(size);
    files[0].path.should.eql(path.join(storageRoot, name));
    (await storage.delete(name)).should.be.true;
    files = await storage.list();
    _.isEmpty(files).should.be.true;
  });

  it('should be reset and preserve the root', async function () {
    storage = new Storage(storageRoot, true, false, log);
    const name = 'foo.bar';
    const size = 1 * 1024 * 1024;
    await addFileToStorage(name, size);
    await storage.reset();
    const files = await storage.list();
    _.isEmpty(files).should.be.true;
    (await fs.exists(storageRoot)).should.be.true;
  });

  it('should be reset and preserve items', async function () {
    storage = new Storage(storageRoot, false, true, log);
    const name = 'foo.bar';
    const size = 1 * 1024 * 1024;
    await addFileToStorage(name, size);
    await storage.reset();
    const files = await storage.list();
    _.isEmpty(files).should.be.false;
    (await fs.exists(storageRoot)).should.be.true;
  });

  async function addFileToStorage(name, size) {
    const dummyPath = path.join(tmpRoot, name);
    await fs.writeFile(dummyPath, Buffer.alloc(size));
    const sha1 = await fs.hash(dummyPath);
    await storage.add({name, sha1}, fs.createReadStream(dummyPath));
    return dummyPath;
  }

});
