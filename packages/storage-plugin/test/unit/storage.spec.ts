import _ from 'lodash';
import {Storage} from '../../lib/storage';
import {tempDir, fs, logger} from '@appium/support';
import path from 'node:path';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

const log = logger.getLogger();

describe('storage', function () {
  let tmpRoot: string | undefined;
  let storage: Storage | null;
  let storageRoot: string | undefined;

  before(async function () {
    tmpRoot = await tempDir.openDir();
  });

  after(async function () {
    if (tmpRoot && (await fs.exists(tmpRoot))) {
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
    if (storageRoot && (await fs.exists(storageRoot))) {
      await fs.rimraf(storageRoot);
      storageRoot = undefined;
    }
  });

  it('should be initially empty', async function () {
    storage = new Storage(storageRoot!, false, false, log);
    const files = await storage.list();
    expect(_.isEmpty(files)).to.be.true;
    expect(await storage.delete('foo')).to.be.false;
  });

  it('should reset all files if shouldPreserveFiles is not requested', async function () {
    const name = 'foo.bar';
    const tmpName = 'bar.baz.filepart';
    await fs.writeFile(path.join(storageRoot!, name), Buffer.alloc(1));
    await fs.writeFile(path.join(storageRoot!, tmpName), Buffer.alloc(1));
    storage = new Storage(storageRoot!, true, false, log);
    const files = await storage.list();
    expect(files.length).to.eql(1);
    await storage.reset();
    expect(await fs.exists(path.join(storageRoot!, name))).to.be.false;
    expect(await fs.exists(path.join(storageRoot!, tmpName))).to.be.false;
  });

  it('should only reset partial files if shouldPreserveFiles requested', async function () {
    const name = 'foo.bar';
    const tmpName = 'bar.baz.filepart';
    await fs.writeFile(path.join(storageRoot!, name), Buffer.alloc(1));
    await fs.writeFile(path.join(storageRoot!, tmpName), Buffer.alloc(1));
    storage = new Storage(storageRoot!, true, true, log);
    let files = await storage.list();
    expect(files.length).to.eql(1);
    await storage.reset();
    files = await storage.list();
    expect(files.length).to.eql(1);
    expect(await fs.exists(path.join(storageRoot!, tmpName))).to.be.false;
  });

  it('should perform basic operations', async function () {
    storage = new Storage(storageRoot!, false, false, log);
    const name = 'foo.bar';
    const size = 1 * 1024 * 1024;
    await addFileToStorage(name, size);
    let files = await storage.list();
    expect(_.isEmpty(files)).to.be.false;
    expect(files[0].name).to.eql(name);
    expect(files[0].size).to.eql(size);
    expect(files[0].path).to.eql(path.join(storageRoot!, name));
    expect(await storage.delete(name)).to.be.true;
    files = await storage.list();
    expect(_.isEmpty(files)).to.be.true;
  });

  it('should be reset and preserve the root', async function () {
    storage = new Storage(storageRoot!, true, false, log);
    const name = 'foo.bar';
    const size = 1 * 1024 * 1024;
    await addFileToStorage(name, size);
    await storage.reset();
    const files = await storage.list();
    expect(_.isEmpty(files)).to.be.true;
    expect(await fs.exists(storageRoot!)).to.be.true;
  });

  it('should be reset and preserve items', async function () {
    storage = new Storage(storageRoot!, false, true, log);
    const name = 'foo.bar';
    const size = 1 * 1024 * 1024;
    await addFileToStorage(name, size);
    await storage.reset();
    const files = await storage.list();
    expect(_.isEmpty(files)).to.be.false;
    expect(await fs.exists(storageRoot!)).to.be.true;
  });

  async function addFileToStorage(name: string, size: number): Promise<string> {
    const dummyPath = path.join(tmpRoot!, name);
    await fs.writeFile(dummyPath, Buffer.alloc(size));
    const sha1 = await fs.hash(dummyPath);
    await storage!.add({name, sha1}, fs.createReadStream(dummyPath));
    return dummyPath;
  }
});
