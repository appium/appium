import B from 'bluebird';
import path from 'path';
import * as util from '../lib/util';
import { tempDir, fs } from '../index';


describe('#util', function () {
  let tmpRoot;
  let tmpFile;
  const content = 'YOLO';

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
      data.toString().should.eql(fileContent.toString('base64'));
    });
  });

  describe('getLockFileGuard()', function () {
    let tmpRoot;
    let lockFile;
    let testFile;

    async function guardedBehavior (text, msBeforeActing) {
      await B.delay(msBeforeActing);
      await fs.appendFile(testFile, text, 'utf8');
      return text;
    }

    async function testFileContents () {
      return (await fs.readFile(testFile)).toString('utf8');
    }

    beforeEach(async function () {
      tmpRoot = await tempDir.openDir();
      lockFile = path.resolve(tmpRoot, 'test.lock');
      testFile = path.resolve(tmpRoot, 'test');
      await fs.writeFile(testFile, 'a', 'utf8');
    });

    afterEach(async function () {
      try {
        await B.all([lockFile, testFile].map((p) => fs.unlink(p)));
      } catch (ign) {}
    });

    it('should lock a file during the given behavior', async function () {
      const guard = util.getLockFileGuard(lockFile);
      await guard.check().should.eventually.be.false;
      const guardPromise = guard(async () => await guardedBehavior('b', 500));
      await B.delay(200);
      await guard.check().should.eventually.be.true;
      await guardPromise;
      await guard.check().should.eventually.be.false;
      await testFileContents().should.eventually.eql('ab');
    });

    it('should recover a broken lock file', async function () {
      await fs.writeFile(lockFile, 'dummy', 'utf8');
      const guard = util.getLockFileGuard(lockFile, {
        timeout: 3,
        tryRecovery: true,
      });
      await guard(async () => await guardedBehavior('b', 500));
      await guard.check().should.eventually.be.false;
      await testFileContents().should.eventually.eql('ab');
    });

    it('should block other behavior until the lock is released', async function () {
      // first prove that without a lock, we get races
      await testFileContents().should.eventually.eql('a');
      const unguardedPromise1 = guardedBehavior('b', 500);
      const unguardedPromise2 = guardedBehavior('c', 100);
      await unguardedPromise1;
      await unguardedPromise2;
      await testFileContents().should.eventually.eql('acb');

      // now prove that with a lock, we don't get any interlopers
      const guard = util.getLockFileGuard(lockFile);
      const guardPromise1 = guard(async () => await guardedBehavior('b', 500));
      const guardPromise2 = guard(async () => await guardedBehavior('c', 100));
      await guardPromise1;
      await guardPromise2;
      await testFileContents().should.eventually.eql('acbbc');
    });

    it('should return the result of the guarded behavior', async function () {
      const guard = util.getLockFileGuard(lockFile);
      const guardPromise1 = guard(async () => await guardedBehavior('hello', 500));
      const guardPromise2 = guard(async () => await guardedBehavior('world', 100));
      const ret1 = await guardPromise1;
      const ret2 = await guardPromise2;
      ret1.should.eql('hello');
      ret2.should.eql('world');
    });

    it('should time out if the lock is not released', async function () {
      this.timeout(5000);
      const guard = util.getLockFileGuard(lockFile, {timeout: 0.5});
      const p1 = guard(async () => await guardedBehavior('hello', 1200));
      const p2 = guard(async () => await guardedBehavior('world', 10));
      await p2.should.eventually.be.rejectedWith(/not acquire lock/);
      await p1.should.eventually.eql('hello');
    });

    it('should still release lock if guarded behavior fails', async function () {
      this.timeout(5000);
      const guard = util.getLockFileGuard(lockFile);
      const p1 = guard(async () => {
        await B.delay(500);
        throw new Error('bad');
      });
      const p2 = guard(async () => await guardedBehavior('world', 100));
      await p1.should.eventually.be.rejectedWith(/bad/);
      await p2.should.eventually.eql('world');
    });
  });

});
