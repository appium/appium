import assert from 'node:assert/strict';
import * as nodeFs from 'node:fs';
import {mkdir, mkdtemp, rm, symlink, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {after, before, describe, it} from 'node:test';

import {fs} from '../../../lib/index.js';
import {isWindows} from '../../../lib/system.js';
import {Walker, walk, type WalkItem, type WalkOptions} from '../../../lib/internal/walker.js';

async function collect(root: string, options?: WalkOptions): Promise<WalkItem[]> {
  const items: WalkItem[] = [];
  for await (const item of walk(root, options)) {
    items.push(item);
  }
  return items;
}

function collectViaEvents(root: string, options?: WalkOptions): Promise<WalkItem[]> {
  return new Promise((resolve, reject) => {
    const items: WalkItem[] = [];
    const walker = walk(root, options);
    walker.on('data', (item: WalkItem) => items.push(item));
    walker.on('error', (err: Error) => reject(err));
    walker.on('end', () => resolve(items));
  });
}

describe('internal/walker', function () {
  describe('walk()', function () {
    let root: string;

    before(async function () {
      root = await mkdtemp(path.join(os.tmpdir(), 'walker-spec-'));
      await writeFile(path.join(root, 'a.txt'), 'a');
      await mkdir(path.join(root, 'sub1'));
      await writeFile(path.join(root, 'sub1', 'b.txt'), 'b');
      await mkdir(path.join(root, 'sub1', 'sub1sub'));
      await writeFile(path.join(root, 'sub1', 'sub1sub', 'c.txt'), 'c');
      await mkdir(path.join(root, 'sub2'));
      await writeFile(path.join(root, 'sub2', 'd.txt'), 'd');
    });

    after(async function () {
      await rm(root, {recursive: true, force: true});
    });

    it('should return a Walker readable stream', function () {
      assert.ok(walk(root) instanceof Walker);
    });

    it('should visit the root and every descendant via async iteration', async function () {
      const paths = (await collect(root)).map((item) => item.path).sort();
      const expected = [
        root,
        path.join(root, 'a.txt'),
        path.join(root, 'sub1'),
        path.join(root, 'sub1', 'b.txt'),
        path.join(root, 'sub1', 'sub1sub'),
        path.join(root, 'sub1', 'sub1sub', 'c.txt'),
        path.join(root, 'sub2'),
        path.join(root, 'sub2', 'd.txt'),
      ].sort();
      assert.deepStrictEqual(paths, expected);
    });

    it('should emit the same items over data/end events', async function () {
      const items = await collectViaEvents(root);
      assert.strictEqual(items.length, 8);
    });

    describe('depthLimit', function () {
      it('should report immediate children but not recurse past depth 0', async function () {
        const paths = (await collect(root, {depthLimit: 0})).map((item) => item.path);
        assert.ok(paths.includes(root));
        assert.ok(paths.includes(path.join(root, 'a.txt')));
        assert.ok(paths.includes(path.join(root, 'sub1')));
        assert.ok(paths.includes(path.join(root, 'sub2')));
        assert.ok(!paths.includes(path.join(root, 'sub1', 'b.txt')));
      });

      it('should recurse one level further with depthLimit 1', async function () {
        const paths = (await collect(root, {depthLimit: 1})).map((item) => item.path);
        assert.ok(paths.includes(path.join(root, 'sub1', 'b.txt')));
        assert.ok(paths.includes(path.join(root, 'sub1', 'sub1sub')));
        assert.ok(!paths.includes(path.join(root, 'sub1', 'sub1sub', 'c.txt')));
      });
    });

    it('should exclude filtered paths and their descendants', async function () {
      const paths = (await collect(root, {filter: (p) => path.basename(p) !== 'sub2'})).map((item) => item.path);
      assert.ok(!paths.includes(path.join(root, 'sub2')));
      assert.ok(!paths.includes(path.join(root, 'sub2', 'd.txt')));
      assert.ok(paths.includes(path.join(root, 'sub1')));
    });
  });

  describe('pathSorter and queueMethod ordering', function () {
    let root: string;

    before(async function () {
      root = await mkdtemp(path.join(os.tmpdir(), 'walker-order-'));
      await mkdir(path.join(root, 'd1'));
      await writeFile(path.join(root, 'd1', 'e1.txt'), 'e1');
      await mkdir(path.join(root, 'd2'));
      await writeFile(path.join(root, 'd2', 'e2.txt'), 'e2');
    });

    after(async function () {
      await rm(root, {recursive: true, force: true});
    });

    const ascending = (a: string, b: string) => a.localeCompare(b);

    it('should visit breadth-first with the default shift queue', async function () {
      const names = (await collect(root, {pathSorter: ascending})).map((item) => path.basename(item.path));
      assert.deepStrictEqual(names, [path.basename(root), 'd1', 'd2', 'e1.txt', 'e2.txt']);
    });

    it('should visit depth-first-ish with a pop queue', async function () {
      const names = (await collect(root, {pathSorter: ascending, queueMethod: 'pop'})).map((item) =>
        path.basename(item.path),
      );
      assert.deepStrictEqual(names, [path.basename(root), 'd2', 'e2.txt', 'd1', 'e1.txt']);
    });
  });

  describe('preserveSymlinks', {skip: isWindows()}, function () {
    let root: string;
    let link: string;

    before(async function () {
      root = await mkdtemp(path.join(os.tmpdir(), 'walker-symlink-'));
      const target = path.join(root, 'target.txt');
      await writeFile(target, 'target');
      link = path.join(root, 'link.txt');
      await symlink(target, link);
    });

    after(async function () {
      await rm(root, {recursive: true, force: true});
    });

    it('should follow symlinks by default', async function () {
      const items = await collect(root);
      const linkItem = items.find((item) => item.path === link);
      assert.strictEqual(linkItem?.stats.isSymbolicLink(), false);
      assert.strictEqual(linkItem?.stats.isFile(), true);
    });

    it('should report the symlink itself when preserveSymlinks is true', async function () {
      const items = await collect(root, {preserveSymlinks: true});
      const linkItem = items.find((item) => item.path === link);
      assert.strictEqual(linkItem?.stats.isSymbolicLink(), true);
    });
  });

  describe('error handling', function () {
    it('should emit an error and never end when the root does not exist', async function () {
      const missing = path.join(os.tmpdir(), `walker-missing-${Date.now()}`);
      await new Promise<void>((resolve, reject) => {
        const walker = walk(missing);
        const timeoutId = setTimeout(() => reject(new Error('timed out waiting for the error event')), 2000);
        walker.on('data', () => {
          clearTimeout(timeoutId);
          reject(new Error('unexpectedly received data for a missing root'));
        });
        walker.on('end', () => {
          clearTimeout(timeoutId);
          reject(new Error('unexpectedly reached end for a missing root'));
        });
        walker.on('error', function (err: Error) {
          clearTimeout(timeoutId);
          assert.strictEqual((err as NodeJS.ErrnoException).code, 'ENOENT');
          resolve();
        });
      });
    });

    it('should still push the directory item and keep walking siblings when readdir fails', async function () {
      const root = await mkdtemp(path.join(os.tmpdir(), 'walker-readdir-error-'));
      try {
        await mkdir(path.join(root, 'goodDir'));
        await writeFile(path.join(root, 'goodDir', 'f.txt'), 'f');
        await mkdir(path.join(root, 'badDir'));
        await writeFile(path.join(root, 'badDir', 'f.txt'), 'f');

        const badDir = path.join(root, 'badDir');
        const customFs = {
          ...nodeFs,
          readdir: (p: nodeFs.PathLike, cb: (err: NodeJS.ErrnoException | null, files: string[]) => void) => {
            if (p === badDir) {
              return cb(new Error('simulated readdir failure') as NodeJS.ErrnoException, []);
            }
            return nodeFs.readdir(p as string, cb);
          },
        } as typeof nodeFs;

        const items: WalkItem[] = [];
        const errors: Array<{err: Error; item?: WalkItem}> = [];
        await new Promise<void>((resolve, reject) => {
          const walker = walk(root, {fs: customFs});
          walker.on('data', (item: WalkItem) => items.push(item));
          walker.on('error', function (err: Error, item?: WalkItem) {
            errors.push({err, item});
          });
          walker.on('end', () => resolve());
          setTimeout(() => reject(new Error('timed out waiting for end')), 2000);
        });

        assert.strictEqual(errors.length, 1);
        assert.strictEqual(errors[0].err.message, 'simulated readdir failure');
        assert.strictEqual(errors[0].item?.path, badDir);

        const paths = items.map((item) => item.path);
        assert.ok(paths.includes(badDir), 'badDir itself should still be reported');
        assert.ok(!paths.includes(path.join(badDir, 'f.txt')), 'contents of badDir should never be discovered');
        assert.ok(paths.includes(path.join(root, 'goodDir', 'f.txt')), 'sibling directory should still be walked');
      } finally {
        await rm(root, {recursive: true, force: true});
      }
    });
  });

  describe('fs.walk()', function () {
    it('should be wired to the vendored Walker', async function () {
      const root = await mkdtemp(path.join(os.tmpdir(), 'walker-passthrough-'));
      try {
        await writeFile(path.join(root, 'a.txt'), 'a');

        const items: WalkItem[] = [];
        await new Promise<void>((resolve, reject) => {
          const walker = fs.walk(root, {depthLimit: 0});
          assert.ok(walker instanceof Walker);
          walker.on('data', (item: WalkItem) => items.push(item));
          walker.on('error', reject);
          walker.on('end', () => resolve());
        });

        const paths = items.map((item) => item.path);
        assert.ok(paths.includes(root));
        assert.ok(paths.includes(path.join(root, 'a.txt')));
      } finally {
        await rm(root, {recursive: true, force: true});
      }
    });
  });
});
