import B from 'bluebird';
import path from 'node:path';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as chai from 'chai';
import * as util from '../../lib/util';
import {tempDir, fs} from '../../lib/index';

describe('#util', function () {
  let tmpRoot: string | null = null;
  let tmpFile: string;
  const content = 'YOLO';

  before(async function () {
    use(chaiAsPromised);
    chai.should();
  });

  beforeEach(async function () {
    tmpRoot = await tempDir.openDir();
    tmpFile = path.resolve(tmpRoot, 'example.txt');
    await fs.writeFile(tmpFile, content, 'utf8');
  });

  afterEach(async function () {
    if (tmpRoot) {
      await fs.rimraf(tmpRoot);
    }
    tmpRoot = null;
  });

  describe('toInMemoryBase64()', function () {
    it('should convert a file to base64 encoding', async function () {
      const data = await util.toInMemoryBase64(tmpFile);
      const fileContent = await fs.readFile(tmpFile);
      expect(data.toString()).to.eql(fileContent.toString('base64'));
    });
  });

  describe('getLockFileGuard()', function () {
    let lockFile: string;
    let testFile: string;
    let guardTmpRoot: string;

    async function guardedBehavior(text: string, msBeforeActing: number) {
      await B.delay(msBeforeActing);
      await fs.appendFile(testFile, text, 'utf8');
      return text;
    }

    async function testFileContents(): Promise<string> {
      return (await fs.readFile(testFile)).toString('utf8');
    }

    beforeEach(async function () {
      guardTmpRoot = await tempDir.openDir();
      lockFile = path.resolve(guardTmpRoot, 'test.lock');
      testFile = path.resolve(guardTmpRoot, 'test');
      await fs.writeFile(testFile, 'a', 'utf8');
    });

    afterEach(async function () {
      try {
        await B.all([lockFile, testFile].map((p) => fs.unlink(p)));
      } catch {
        // ignore
      }
    });

    it('should lock a file during the given behavior', async function () {
      const guard = util.getLockFileGuard(lockFile);
      await expect(guard.check()).to.eventually.be.false;
      const guardPromise = guard(async () => await guardedBehavior('b', 500));
      await B.delay(200);
      await expect(guard.check()).to.eventually.be.true;
      await guardPromise;
      await expect(guard.check()).to.eventually.be.false;
      await expect(testFileContents()).to.eventually.eql('ab');
    });

    it('should recover a broken lock file', async function () {
      await fs.writeFile(lockFile, 'dummy', 'utf8');
      const guard = util.getLockFileGuard(lockFile, {
        timeout: 3,
        tryRecovery: true,
      });
      await guard(async () => await guardedBehavior('b', 500));
      await expect(guard.check()).to.eventually.be.false;
      await expect(testFileContents()).to.eventually.eql('ab');
    });

    it('should block other behavior until the lock is released', async function () {
      await expect(testFileContents()).to.eventually.eql('a');
      const unguardedPromise1 = guardedBehavior('b', 500);
      const unguardedPromise2 = guardedBehavior('c', 100);
      await unguardedPromise1;
      await unguardedPromise2;
      await expect(testFileContents()).to.eventually.eql('acb');

      const guard = util.getLockFileGuard(lockFile);
      const guardPromise1 = guard(async () => await guardedBehavior('b', 500));
      const guardPromise2 = guard(async () => await guardedBehavior('c', 100));
      await guardPromise1;
      await guardPromise2;
      await expect(testFileContents()).to.eventually.eql('acbbc');
    });

    it('should return the result of the guarded behavior', async function () {
      const guard = util.getLockFileGuard(lockFile);
      const guardPromise1 = guard(async () => await guardedBehavior('hello', 500));
      const guardPromise2 = guard(async () => await guardedBehavior('world', 100));
      const ret1 = await guardPromise1;
      const ret2 = await guardPromise2;
      expect(ret1).to.eql('hello');
      expect(ret2).to.eql('world');
    });

    it('should time out if the lock is not released', async function () {
      this.timeout(5000);
      const guard = util.getLockFileGuard(lockFile, {timeout: 0.5});
      const p1 = guard(async () => await guardedBehavior('hello', 1200));
      const p2 = guard(async () => await guardedBehavior('world', 10));
      await expect(p2).to.eventually.be.rejectedWith(/not acquire lock/);
      await expect(p1).to.eventually.eql('hello');
    });

    it('should still release lock if guarded behavior fails', async function () {
      this.timeout(5000);
      const guard = util.getLockFileGuard(lockFile);
      const p1 = guard(async () => {
        await B.delay(500);
        throw new Error('bad');
      });
      const p2 = guard(async () => await guardedBehavior('world', 100));
      await expect(p1).to.eventually.be.rejectedWith(/bad/);
      await expect(p2).to.eventually.eql('world');
    });
  });
});
