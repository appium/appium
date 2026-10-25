import assert from 'node:assert/strict';
import path from 'node:path';
import {Readable} from 'node:stream';
import {afterEach, beforeEach, describe, it} from 'node:test';
import zlib from 'node:zlib';

import * as yauzl from 'yauzl';

import {fs, tempDir} from '../../lib/index.js';
import {isWindows} from '../../lib/system.js';
import * as zip from '../../lib/zip.js';
import {MockReadWriteStream} from '../helpers.js';
import {type BuildEntry, buildZip} from '../zip-builder.js';

describe('#zip', function () {
  let assetsPath: string;
  let zippedFilePath: string;
  let tmpRoot: string;

  beforeEach(async function () {
    assetsPath = await tempDir.openDir();
    tmpRoot = await tempDir.openDir();
    const zippedBase64 =
      'UEsDBAoAAAAAALlzk0oAAAAAAAAAAAAAAAAJABAAdW56aXBwZWQvVVgMANBO+VjO1vdY9QEUAFBLAwQKAAAAAADAc5NKAAAAAAAAAAAAAAAAEgAQAHVuemlwcGVkL3Rlc3QtZGlyL1VYDADQTvlY19b3WPUBFABQSwMEFAAIAAgAwnOTSgAAAAAAAAAAAAAAABcAEAB1bnppcHBlZC90ZXN0LWRpci9hLnR4dFVYDACDTvlY3Nb3WPUBFADzSM3JyVcIzy/KSQEAUEsHCFaxF0oNAAAACwAAAFBLAwQUAAgACADEc5NKAAAAAAAAAAAAAAAAFwAQAHVuemlwcGVkL3Rlc3QtZGlyL2IudHh0VVgMAINO+Vjf1vdY9QEUAHPLz1dwSiwCAFBLBwhIfrZJCQAAAAcAAABQSwECFQMKAAAAAAC5c5NKAAAAAAAAAAAAAAAACQAMAAAAAAAAAABA7UEAAAAAdW56aXBwZWQvVVgIANBO+VjO1vdYUEsBAhUDCgAAAAAAwHOTSgAAAAAAAAAAAAAAABIADAAAAAAAAAAAQO1BNwAAAHVuemlwcGVkL3Rlc3QtZGlyL1VYCADQTvlY19b3WFBLAQIVAxQACAAIAMJzk0pWsRdKDQAAAAsAAAAXAAwAAAAAAAAAAECkgXcAAAB1bnppcHBlZC90ZXN0LWRpci9hLnR4dFVYCACDTvlY3Nb3WFBLAQIVAxQACAAIAMRzk0pIfrZJCQAAAAcAAAAXAAwAAAAAAAAAAECkgdkAAAB1bnppcHBlZC90ZXN0LWRpci9iLnR4dFVYCACDTvlY39b3WFBLBQYAAAAABAAEADEBAAA3AQAAAAA=';
    zippedFilePath = path.resolve(tmpRoot, 'zipped.zip');
    await fs.writeFile(zippedFilePath, zippedBase64, 'base64');
    await zip.extractAllTo(zippedFilePath, assetsPath);
  });

  afterEach(async function () {
    for (const tmpPath of [assetsPath, tmpRoot]) {
      if (!(await fs.exists(tmpPath))) {
        continue;
      }
      try {
        await fs.rimraf(tmpPath);
      } catch {
        // on windows, this can break due to file handles being open on files within the directory.
      }
    }
  });

  describe('extractAllTo()', function () {
    it('should extract contents of a .zip file to a directory', async function () {
      assert.strictEqual(
        await fs.readFile(path.resolve(assetsPath, 'unzipped', 'test-dir', 'a.txt'), {
          encoding: 'utf8',
        }),
        'Hello World',
      );
      assert.strictEqual(
        await fs.readFile(path.resolve(assetsPath, 'unzipped', 'test-dir', 'b.txt'), {
          encoding: 'utf8',
        }),
        'Foo Bar',
      );
    });

    it(
      'should reject files written through symlinks that point outside the destination',
      {skip: isWindows()},
      async function () {
        const outputPath = path.resolve(tmpRoot, 'output');
        const escapePath = path.resolve(tmpRoot, 'escape');
        const dstPath = path.resolve(tmpRoot, 'symlink-bypass.zip');
        await fs.mkdir(escapePath);
        await createStoredZip(dstPath, [
          {
            name: 'pwn',
            contents: escapePath,
            mode: 0o120777,
          },
          {
            name: 'pwn/owned.txt',
            contents: 'PWNED via symlink Zip Slip\n',
            mode: 0o100644,
          },
        ]);

        await assert.rejects(zip.extractAllTo(dstPath, outputPath), /Out of bound/);
        assert.strictEqual(await fs.exists(path.resolve(outputPath, 'pwn')), false);
        assert.strictEqual(await fs.exists(path.resolve(escapePath, 'owned.txt')), false);
      },
    );

    it('should extract many entries sharing nested parent directories', async function () {
      const outputPath = path.resolve(tmpRoot, 'output');
      const dstPath = path.resolve(tmpRoot, 'nested.zip');
      const names = ['a/b/c/1.txt', 'a/b/2.txt', 'a/b/c/d/3.txt', 'a/4.txt', 'a/b/c/5.txt', 'e/6.txt'];
      await createStoredZip(
        dstPath,
        names.map((name) => ({name, contents: name, mode: 0o100644})),
      );
      await zip.extractAllTo(dstPath, outputPath);
      for (const name of names) {
        assert.strictEqual(await fs.readFile(path.resolve(outputPath, name), 'utf8'), name);
      }
    });

    it('should validate shared parent directories a bounded number of times', async function (t) {
      const outputPath = path.resolve(tmpRoot, 'output');
      const dstPath = path.resolve(tmpRoot, 'shared-parents.zip');
      const fileCount = 40;
      await createStoredZip(
        dstPath,
        Array.from({length: fileCount}, (_, i) => ({name: `a/b/c/${i}.txt`, contents: `${i}`, mode: 0o100644})),
      );
      const lstat = t.mock.method(fs, 'lstat', fs.lstat);
      const realpath = t.mock.method(fs, 'realpath', fs.realpath);
      await zip.extractAllTo(dstPath, outputPath);
      // Per file: one lstat of the destination and one realpath of the remembered folder,
      // plus a constant number for the folders (independent of the nesting depth)
      assert.ok(lstat.mock.callCount() <= fileCount + 10, `lstat calls: ${lstat.mock.callCount()}`);
      assert.ok(realpath.mock.callCount() <= fileCount + 10, `realpath calls: ${realpath.mock.callCount()}`);
    });

    it('should apply the mode of explicit folder entries', {skip: isWindows()}, async function () {
      const outputPath = path.resolve(tmpRoot, 'output');
      const dstPath = path.resolve(tmpRoot, 'folder-mode.zip');
      await createStoredZip(dstPath, [
        {name: 'd/', contents: '', mode: 0o40750},
        {name: 'd/f.txt', contents: 'x', mode: 0o100644},
      ]);
      await zip.extractAllTo(dstPath, outputPath);
      assert.strictEqual((await fs.stat(path.resolve(outputPath, 'd'))).mode & 0o777, 0o750 & ~process.umask());
    });

    it('should extract folders whose names differ only in case', async function () {
      const outputPath = path.resolve(tmpRoot, 'output');
      const dstPath = path.resolve(tmpRoot, 'case.zip');
      await createStoredZip(dstPath, [
        {name: 'A/x', contents: 'x', mode: 0o100644},
        {name: 'a/y', contents: 'y', mode: 0o100644},
      ]);
      await zip.extractAllTo(dstPath, outputPath);
      assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'A/x'), 'utf8'), 'x');
      assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'a/y'), 'utf8'), 'y');
    });

    describe('JS symlink containment', {skip: isWindows()}, function () {
      for (const existing of [false, true]) {
        it(`should reject a symlink chain targeting an ${existing ? 'existing' : 'absent'} outside file`, async function () {
          const outputPath = path.resolve(tmpRoot, 'output');
          const outsidePath = path.resolve(tmpRoot, 'escaped.txt');
          const dstPath = path.resolve(tmpRoot, 'chain.zip');
          if (existing) {
            await fs.writeFile(outsidePath, 'original');
          }
          await createStoredZip(dstPath, [
            {name: 'd/', contents: '', mode: 0o40755},
            {name: 'd/up', contents: '..', mode: 0o120777},
            {name: 'f', contents: 'd/up/../escaped.txt', mode: 0o120777},
            {name: 'f', contents: 'replacement', mode: 0o100644},
          ]);
          await assert.rejects(zip.extractAllTo(dstPath, outputPath), /Out of bound symlink target/);
          await assert.rejects(fs.lstat(path.resolve(outputPath, 'f')), {code: 'ENOENT'});
          if (existing) {
            assert.strictEqual(await fs.readFile(outsidePath, 'utf8'), 'original');
          } else {
            assert.strictEqual(await fs.exists(outsidePath), false);
          }
        });

        it(`should refuse a regular file over a ${existing ? 'non-dangling' : 'dangling'} symlink`, async function () {
          const outputPath = path.resolve(tmpRoot, 'output');
          const dstPath = path.resolve(tmpRoot, 'duplicate.zip');
          await fs.mkdir(outputPath);
          const targetPath = path.resolve(outputPath, 'target');
          if (existing) {
            await fs.writeFile(targetPath, 'original');
          }
          await createStoredZip(dstPath, [
            {name: 'f', contents: 'target', mode: 0o120777},
            {name: 'f', contents: 'replacement', mode: 0o100644},
          ]);
          await assert.rejects(zip.extractAllTo(dstPath, outputPath), /existing symlink/);
          assert.strictEqual((await fs.lstat(path.resolve(outputPath, 'f'))).isSymbolicLink(), true);
          if (existing) {
            assert.strictEqual(await fs.readFile(targetPath, 'utf8'), 'original');
          } else {
            assert.strictEqual(await fs.exists(targetPath), false);
          }
        });
      }

      it('should preserve framework links to files extracted later', async function () {
        const outputPath = path.resolve(tmpRoot, 'output');
        const dstPath = path.resolve(tmpRoot, 'framework.zip');
        await createStoredZip(dstPath, [
          {name: 'Versions/', contents: '', mode: 0o40755},
          {name: 'Versions/Current', contents: 'A', mode: 0o120777},
          {name: 'Resources', contents: 'Versions/Current/Resources', mode: 0o120777},
          {name: 'Versions/A/Resources/data', contents: 'safe', mode: 0o100644},
          {name: 'absolute', contents: path.resolve(outputPath, 'Resources/data'), mode: 0o120777},
        ]);
        await zip.extractAllTo(dstPath, outputPath);
        assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'Resources/data'), 'utf8'), 'safe');
        assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'absolute'), 'utf8'), 'safe');
      });

      it('should extract files through an internal directory symlink', async function () {
        const outputPath = path.resolve(tmpRoot, 'output');
        const dstPath = path.resolve(tmpRoot, 'directory-link.zip');
        await createStoredZip(dstPath, [
          {name: 'target/', contents: '', mode: 0o40755},
          {name: 'alias', contents: 'target', mode: 0o120777},
          {name: 'alias/data', contents: 'safe', mode: 0o100644},
        ]);
        await zip.extractAllTo(dstPath, outputPath);
        assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'target/data'), 'utf8'), 'safe');
      });

      it('should resolve parent components after following an internal directory link', async function () {
        const outputPath = path.resolve(tmpRoot, 'output');
        const dstPath = path.resolve(tmpRoot, 'internal.zip');
        await createStoredZip(dstPath, [
          {name: 'd/', contents: '', mode: 0o40755},
          {name: 'd/down', contents: 'nested', mode: 0o120777},
          {name: 'f', contents: 'd/down/../target', mode: 0o120777},
          {name: 'd/nested/', contents: '', mode: 0o40755},
          {name: 'd/target', contents: 'safe', mode: 0o100644},
        ]);
        await zip.extractAllTo(dstPath, outputPath);
        assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'f'), 'utf8'), 'safe');
      });

      for (const existing of [false, true]) {
        it(`should reject a later link redirecting a forward reference to an ${existing ? 'existing' : 'absent'} outside file`, async function () {
          const outputPath = path.resolve(tmpRoot, 'output');
          const outsidePath = path.resolve(tmpRoot, 'escaped.txt');
          const dstPath = path.resolve(tmpRoot, 'forward-chain.zip');
          if (existing) {
            await fs.writeFile(outsidePath, 'original');
          }
          await createStoredZip(dstPath, [
            {name: 's/', contents: '', mode: 0o40755},
            {name: 'f', contents: 's/t/../escaped.txt', mode: 0o120777},
            {name: 's/t', contents: '..', mode: 0o120777},
          ]);
          await assert.rejects(zip.extractAllTo(dstPath, outputPath), /Out of bound symlink target/);
          await assert.rejects(fs.lstat(path.resolve(outputPath, 's/t')), {code: 'ENOENT'});
          await assert.rejects(fs.realpath(path.resolve(outputPath, 'f')), {code: 'ENOENT'});
          if (existing) {
            assert.strictEqual(await fs.readFile(outsidePath, 'utf8'), 'original');
          } else {
            assert.strictEqual(await fs.exists(outsidePath), false);
          }
        });
      }

      for (const [referenceName, entryName] of [
        ['\u00e9', 'e\u0301'],
        ['e\u0301', '\u00e9'],
      ]) {
        for (const existing of [false, true]) {
          it(`should recheck Unicode-equivalent forward references (${JSON.stringify(referenceName)} -> ${JSON.stringify(entryName)}, outside target ${existing ? 'exists' : 'missing'})`, async function (t) {
            // Probe this filesystem instead of assuming all macOS volumes normalize names.
            const probePath = path.resolve(tmpRoot, referenceName);
            await fs.writeFile(probePath, 'probe');
            const equivalentNames = await fs.exists(path.resolve(tmpRoot, entryName));
            await fs.unlink(probePath);
            if (!equivalentNames) {
              t.skip('Filesystem treats the Unicode spellings as distinct names');
              return;
            }

            const outputPath = path.resolve(tmpRoot, 'output');
            const outsidePath = path.resolve(tmpRoot, 'escaped.txt');
            const dstPath = path.resolve(tmpRoot, 'unicode-forward-chain.zip');
            if (existing) {
              await fs.writeFile(outsidePath, 'original');
            }
            await createStoredZip(dstPath, [
              {name: 's/', contents: '', mode: 0o40755},
              {name: 'f', contents: `s/${referenceName}/../escaped.txt`, mode: 0o120777},
              {name: `s/${entryName}`, contents: '..', mode: 0o120777},
            ]);

            await assert.rejects(zip.extractAllTo(dstPath, outputPath), /Out of bound symlink target/);
            await assert.rejects(fs.lstat(path.resolve(outputPath, 's', entryName)), {code: 'ENOENT'});
            await assert.rejects(fs.realpath(path.resolve(outputPath, 'f')), {code: 'ENOENT'});
            if (existing) {
              assert.strictEqual(await fs.readFile(outsidePath, 'utf8'), 'original');
            } else {
              assert.strictEqual(await fs.exists(outsidePath), false);
            }
          });
        }
      }

      it('should preserve a forward reference completed by a safe later link', async function () {
        const outputPath = path.resolve(tmpRoot, 'output');
        const dstPath = path.resolve(tmpRoot, 'safe-forward-chain.zip');
        await createStoredZip(dstPath, [
          {name: 's/', contents: '', mode: 0o40755},
          {name: 'f', contents: 's/t/../target', mode: 0o120777},
          {name: 's/t', contents: 'nested', mode: 0o120777},
          {name: 's/nested/', contents: '', mode: 0o40755},
          {name: 's/target', contents: 'safe', mode: 0o100644},
        ]);
        await zip.extractAllTo(dstPath, outputPath);
        assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'f'), 'utf8'), 'safe');
      });

      it('should track indirect forward references after their dependencies change', async function () {
        const outputPath = path.resolve(tmpRoot, 'output');
        const dstPath = path.resolve(tmpRoot, 'indirect-forward-chain.zip');
        // f first depends on missing s/t, then on s/u after t -> u is created.
        // Creating alias/u -> .. (the same path as s/u) redirects f outside the root.
        await createStoredZip(dstPath, [
          {name: 's/', contents: '', mode: 0o40755},
          {name: 'alias', contents: 's', mode: 0o120777},
          {name: 'f', contents: 's/t/../escaped.txt', mode: 0o120777},
          {name: 's/t', contents: 'u', mode: 0o120777},
          {name: 'alias/u', contents: '..', mode: 0o120777},
        ]);
        await assert.rejects(zip.extractAllTo(dstPath, outputPath), /Out of bound symlink target/);
        await assert.rejects(fs.lstat(path.resolve(outputPath, 's/u')), {code: 'ENOENT'});
        await assert.rejects(fs.realpath(path.resolve(outputPath, 'f')), {code: 'ENOENT'});
      });

      it('should remove a later link that completes a cycle', async function () {
        const outputPath = path.resolve(tmpRoot, 'output');
        const dstPath = path.resolve(tmpRoot, 'forward-cycle.zip');
        await createStoredZip(dstPath, [
          {name: 'a', contents: 'b', mode: 0o120777},
          {name: 'b', contents: 'a', mode: 0o120777},
        ]);
        await assert.rejects(zip.extractAllTo(dstPath, outputPath), /Too many symlinks/);
        await assert.rejects(fs.lstat(path.resolve(outputPath, 'b')), {code: 'ENOENT'});
      });

      it('should reject cyclic symlink targets without hanging', async function () {
        const outputPath = path.resolve(tmpRoot, 'output');
        const dstPath = path.resolve(tmpRoot, 'cycle.zip');
        await createStoredZip(dstPath, [
          {name: 'a', contents: 'a', mode: 0o120777},
          {name: 'b', contents: 'a', mode: 0o120777},
        ]);
        await assert.rejects(zip.extractAllTo(dstPath, outputPath), /Too many symlinks/);
      });

      it('should not let a symlink entry replace a cached directory', async function () {
        const outputPath = path.resolve(tmpRoot, 'output');
        const dstPath = path.resolve(tmpRoot, 'replace-cached.zip');
        await createStoredZip(dstPath, [
          {name: 'a/first.txt', contents: 'first', mode: 0o100644},
          {name: 'a', contents: 'elsewhere', mode: 0o120777},
          {name: 'a/second.txt', contents: 'second', mode: 0o100644},
        ]);
        await assert.rejects(zip.extractAllTo(dstPath, outputPath), {code: 'EEXIST'});
        assert.ok((await fs.lstat(path.resolve(outputPath, 'a'))).isDirectory());
        assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'a/first.txt'), 'utf8'), 'first');
      });

      it('should extract nested entries under an in-root symlinked directory', async function () {
        const outputPath = path.resolve(tmpRoot, 'output');
        const dstPath = path.resolve(tmpRoot, 'symlinked-parent.zip');
        await createStoredZip(dstPath, [
          {name: 'real/a.txt', contents: 'a', mode: 0o100644},
          {name: 'link', contents: 'real', mode: 0o120777},
          {name: 'link/sub/b.txt', contents: 'b', mode: 0o100644},
          {name: 'link/sub/c.txt', contents: 'c', mode: 0o100644},
        ]);
        await zip.extractAllTo(dstPath, outputPath);
        assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'real/sub/b.txt'), 'utf8'), 'b');
        assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'real/sub/c.txt'), 'utf8'), 'c');
      });

      it('should reject an escaping symlinked directory below a cached one', async function () {
        const outputPath = path.resolve(tmpRoot, 'output');
        const outsidePath = path.resolve(tmpRoot, 'outside');
        const dstPath = path.resolve(tmpRoot, 'cached-parent.zip');
        await fs.mkdir(path.resolve(outputPath, 'a'), {recursive: true});
        await fs.mkdir(outsidePath);
        await fs.symlink(outsidePath, path.resolve(outputPath, 'a', 'b'));
        await createStoredZip(dstPath, [
          {name: 'a/1.txt', contents: '1', mode: 0o100644},
          {name: 'a/b/2.txt', contents: '2', mode: 0o100644},
        ]);
        await assert.rejects(zip.extractAllTo(dstPath, outputPath), /Out of bound/);
        assert.deepStrictEqual(await fs.readdir(outsidePath), []);
      });

      it('should reject a remembered folder replaced by a link during the extraction', async function (t) {
        const outputPath = path.resolve(tmpRoot, 'output');
        const outsidePath = path.resolve(tmpRoot, 'outside');
        const dstPath = path.resolve(tmpRoot, 'swapped.zip');
        await fs.mkdir(outsidePath);
        await createStoredZip(dstPath, [
          {name: 'a/1.txt', contents: '1', mode: 0o100644},
          {name: 'a/2.txt', contents: '2', mode: 0o100644},
        ]);
        const openFile = fs.openFile;
        let swapped = false;
        t.mock.method(fs, 'openFile', async (target: any, flags: any, mode: any) => {
          const handle = await openFile(target, flags, mode);
          if (!swapped) {
            // The first file is in place: replace its folder behind the extractor's back
            swapped = true;
            const dirPath = path.resolve(await fs.realpath(outputPath), 'a');
            await fs.rename(dirPath, `${dirPath}-moved`);
            await fs.symlink(outsidePath, dirPath);
          }
          return handle;
        });
        await assert.rejects(zip.extractAllTo(dstPath, outputPath, {concurrency: 1}), /Out of bound path/);
        assert.deepStrictEqual(await fs.readdir(outsidePath), []);
      });

      it('should reject a remembered folder moved outside of the root and linked back', async function (t) {
        const outputPath = path.resolve(tmpRoot, 'output');
        const movedPath = path.resolve(tmpRoot, 'moved');
        const dstPath = path.resolve(tmpRoot, 'relocated.zip');
        await createStoredZip(dstPath, [
          {name: 'a/1.txt', contents: '1', mode: 0o100644},
          {name: 'a/2.txt', contents: '2', mode: 0o100644},
        ]);
        const openFile = fs.openFile;
        let swapped = false;
        t.mock.method(fs, 'openFile', async (target: any, flags: any, mode: any) => {
          const handle = await openFile(target, flags, mode);
          if (!swapped) {
            // The folder keeps its identity, but now lives outside of the root behind a link
            swapped = true;
            const dirPath = path.resolve(await fs.realpath(outputPath), 'a');
            await fs.rename(dirPath, movedPath);
            await fs.symlink(movedPath, dirPath);
          }
          return handle;
        });
        await assert.rejects(zip.extractAllTo(dstPath, outputPath, {concurrency: 1}), /Out of bound path/);
        assert.deepStrictEqual(await fs.readdir(movedPath), ['1.txt']);
      });

      it('should not create a folder below a remembered folder moved outside of the root', async function (t) {
        const outputPath = path.resolve(tmpRoot, 'output');
        const movedPath = path.resolve(tmpRoot, 'moved');
        const dstPath = path.resolve(tmpRoot, 'relocated-child.zip');
        await createStoredZip(dstPath, [
          {name: 'a/1.txt', contents: '1', mode: 0o100644},
          {name: 'a/new/2.txt', contents: '2', mode: 0o100644},
        ]);
        let swap: Promise<void> | undefined;
        const swapOnce = async () => {
          const dirPath = path.resolve(await fs.realpath(outputPath), 'a');
          // Files are written in the background, the first one must be in place
          while (!(await fs.exists(path.join(dirPath, '1.txt')))) {
            await new Promise((resolve) => setTimeout(resolve, 1));
          }
          // The folder keeps its identity, but now lives outside of the root behind a link
          await fs.rename(dirPath, movedPath);
          await fs.symlink(movedPath, dirPath);
        };
        // Both lookups of the new folder wait for the swap, whichever fails first
        for (const method of ['stat', 'realpath'] as const) {
          const original: any = fs[method];
          t.mock.method(fs, method, async (target: any, ...rest: any[]) => {
            if (String(target).endsWith(path.join('a', 'new'))) {
              await (swap ??= swapOnce());
            }
            return await original(target, ...rest);
          });
        }
        await assert.rejects(zip.extractAllTo(dstPath, outputPath, {concurrency: 1}), /Out of bound path/);
        assert.deepStrictEqual(await fs.readdir(movedPath), ['1.txt']);
      });

      it('should reject a remembered folder link whose target was replaced during the extraction', async function (t) {
        const outputPath = path.resolve(tmpRoot, 'output');
        const outsidePath = path.resolve(tmpRoot, 'outside');
        const dstPath = path.resolve(tmpRoot, 'swapped-target.zip');
        await fs.mkdir(path.resolve(outputPath, 'real'), {recursive: true});
        await fs.symlink('real', path.resolve(outputPath, 'alias'));
        await fs.mkdir(outsidePath);
        await createStoredZip(dstPath, [
          {name: 'alias/1.txt', contents: '1', mode: 0o100644},
          {name: 'alias/2.txt', contents: '2', mode: 0o100644},
        ]);
        const openFile = fs.openFile;
        let swapped = false;
        t.mock.method(fs, 'openFile', async (target: any, flags: any, mode: any) => {
          const handle = await openFile(target, flags, mode);
          if (!swapped) {
            // The link stays as it is, but what it points to is replaced
            swapped = true;
            const realPath = path.resolve(await fs.realpath(outputPath), 'real');
            await fs.rename(realPath, `${realPath}-moved`);
            await fs.symlink(outsidePath, realPath);
          }
          return handle;
        });
        await assert.rejects(zip.extractAllTo(dstPath, outputPath, {concurrency: 1}), /Out of bound path/);
        assert.deepStrictEqual(await fs.readdir(outsidePath), []);
      });

      it('should not trust a folder that appeared while it was being created', async function (t) {
        const outputPath = path.resolve(tmpRoot, 'output');
        const dstPath = path.resolve(tmpRoot, 'mkdir-race.zip');
        await fs.mkdir(outputPath);
        const realRoot = await fs.realpath(outputPath);
        const mkdir = fs.mkdir;
        t.mock.method(fs, 'mkdir', async (target: any, opts: any) => {
          if (target === path.resolve(realRoot, 'a')) {
            // fs.mkdir ignores EEXIST, so the result alone does not tell what is there now
            await fs.symlink('.', target);
          }
          return await mkdir(target, opts);
        });
        // The parent `a` is only passed on the way to `a/b`, but is remembered for the next entry
        await createStoredZip(dstPath, [
          {name: 'a/b/f.txt', contents: 'x', mode: 0o100644},
          {name: 'a/escape', contents: '..', mode: 0o120777},
        ]);
        await assert.rejects(zip.extractAllTo(dstPath, outputPath), /Out of bound symlink target/);
        await assert.rejects(fs.lstat(path.resolve(realRoot, 'escape')), {code: 'ENOENT'});
      });

      it('should reject a folder that is a dangling link', async function () {
        const outputPath = path.resolve(tmpRoot, 'output');
        const dstPath = path.resolve(tmpRoot, 'dangling-folder.zip');
        await fs.mkdir(outputPath);
        const missing = path.resolve(outputPath, 'missing');
        await fs.symlink(missing, path.resolve(outputPath, 'a'));
        await createStoredZip(dstPath, [{name: 'a/f.txt', contents: 'x', mode: 0o100644}]);
        await assert.rejects(zip.extractAllTo(dstPath, outputPath));
        assert.strictEqual(await fs.exists(missing), false);
      });

      it('should not follow a destination symlink introduced after validation', async function (t) {
        const outputPath = path.resolve(tmpRoot, 'output');
        const dstPath = path.resolve(tmpRoot, 'race.zip');
        const outsidePath = path.resolve(tmpRoot, 'outside');
        await fs.mkdir(outputPath);
        // The extractor passes real paths (e.g. /private/var on macOS) to realpath
        const dest = path.resolve(await fs.realpath(outputPath), 'f');
        await fs.writeFile(dest, 'inside');
        await fs.writeFile(outsidePath, 'original');
        await createStoredZip(dstPath, [{name: 'f', contents: 'replacement', mode: 0o100644}]);
        const realpath = fs.realpath;
        t.mock.method(fs, 'realpath', async (candidate: string) => {
          const result = await realpath(candidate);
          if (candidate === dest) {
            await fs.unlink(dest);
            await fs.symlink(outsidePath, dest);
          }
          return result;
        });
        await assert.rejects(zip.extractAllTo(dstPath, outputPath), {code: 'ELOOP'});
        assert.strictEqual(await fs.readFile(outsidePath, 'utf8'), 'original');
      });

      for (const existing of [false, true]) {
        it(`should validate unrelated links to an ${existing ? 'existing' : 'absent'} target with linear filesystem work`, async function (t) {
          const outputPath = path.resolve(tmpRoot, 'output');
          const dstPath = path.resolve(tmpRoot, 'many-links.zip');
          await fs.mkdir(outputPath);
          if (existing) {
            await fs.writeFile(path.resolve(outputPath, 'target'), 'safe');
          }
          const linkCount = 64;
          await createStoredZip(
            dstPath,
            Array.from({length: linkCount}, (_, i) => ({
              name: `link-${i}`,
              contents: 'target',
              mode: 0o120777,
            })),
          );
          const lstat = t.mock.method(fs, 'lstat', fs.lstat);
          await zip.extractAllTo(dstPath, outputPath);
          // Count filesystem work instead of imposing a machine-dependent time limit.
          assert.ok(lstat.mock.callCount() <= linkCount * 4);
          for (let i = 0; i < linkCount; i++) {
            assert.strictEqual(await fs.readlink(path.resolve(outputPath, `link-${i}`)), 'target');
          }
        });
      }
    });

    it('should preserve an existing file when opening a ZIP entry fails', async function () {
      const outputPath = path.resolve(tmpRoot, 'output');
      const dstPath = path.resolve(tmpRoot, 'unsupported-compression.zip');
      await fs.mkdir(outputPath);
      await fs.writeFile(path.resolve(outputPath, 'f'), 'original contents');
      await createStoredZip(dstPath, [{name: 'f', contents: 'replacement', mode: 0o100644, compressionMethod: 99}]);
      await assert.rejects(zip.extractAllTo(dstPath, outputPath), /unsupported compression method/);
      assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'f'), 'utf8'), 'original contents');
    });

    it('should continue to overwrite regular files', async function () {
      const outputPath = path.resolve(tmpRoot, 'output');
      const dstPath = path.resolve(tmpRoot, 'overwrite.zip');
      await fs.mkdir(outputPath);
      await fs.writeFile(path.resolve(outputPath, 'f'), 'original contents');
      await createStoredZip(dstPath, [{name: 'f', contents: 'new', mode: 0o100644}]);
      await zip.extractAllTo(dstPath, outputPath);
      assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'f'), 'utf8'), 'new');
    });

    it('should extract an entry whose name starts with dots but stays in the destination', async function () {
      const outputPath = path.resolve(tmpRoot, 'output-dotdot');
      const dstPath = path.resolve(tmpRoot, 'dotdot-name.zip');
      await createStoredZip(dstPath, [
        {
          name: '..foo.txt',
          contents: 'safe\n',
          mode: 0o100644,
        },
      ]);
      await zip.extractAllTo(dstPath, outputPath);
      assert.strictEqual(await fs.readFile(path.resolve(outputPath, '..foo.txt'), {encoding: 'utf8'}), 'safe\n');
    });
  });

  describe('JS entry content handling', function () {
    const BIG = 5 * 1024 * 1024;

    async function extractEntries(entries: BuildEntry[], opts: zip.ExtractAllOptions = {}): Promise<string> {
      const archive = path.resolve(tmpRoot, 'entries.zip');
      const out = path.resolve(tmpRoot, 'entries-out');
      await fs.writeFile(archive, buildZip(entries));
      await zip.extractAllTo(archive, out, opts);
      return out;
    }

    describe('file names', function () {
      function unicodePathExtra(rawName: string, unicodeName: string, crcName = rawName): Buffer {
        const unicode = Buffer.from(unicodeName);
        const extra = Buffer.alloc(4 + 5 + unicode.length);
        extra.writeUInt16LE(0x7075, 0);
        extra.writeUInt16LE(5 + unicode.length, 2);
        extra[4] = 1;
        extra.writeUInt32LE(zlib.crc32(Buffer.from(crcName)), 5);
        unicode.copy(extra, 9);
        return extra;
      }

      it('should decode names not flagged as UTF-8 as utf8 by default', async function () {
        const out = await extractEntries([{name: 'café.txt', data: 'x', noUtf8Flag: true}]);
        assert.strictEqual(await fs.exists(path.resolve(out, 'café.txt')), true);
      });

      it('should use the requested encoding for names not flagged as UTF-8', async function () {
        const out = await extractEntries([{name: 'café.txt', data: 'x', noUtf8Flag: true}], {
          fileNamesEncoding: 'latin1',
        });
        assert.strictEqual(await fs.exists(path.resolve(out, Buffer.from('café.txt').toString('latin1'))), true);
      });

      it('should prefer the UTF-8 flag over the requested encoding', async function () {
        const out = await extractEntries([{name: 'café.txt', data: 'x'}], {fileNamesEncoding: 'latin1'});
        assert.strictEqual(await fs.exists(path.resolve(out, 'café.txt')), true);
      });

      it('should use the Info-ZIP unicode path field if it matches the name', async function () {
        const centralExtra = unicodePathExtra('fallback.txt', 'ünicöde.txt');
        const out = await extractEntries([{name: 'fallback.txt', data: 'x', noUtf8Flag: true, centralExtra}]);
        assert.strictEqual(await fs.exists(path.resolve(out, 'ünicöde.txt')), true);
        assert.strictEqual(await fs.exists(path.resolve(out, 'fallback.txt')), false);
      });

      it('should ignore the Info-ZIP unicode path field made for another name', async function () {
        const centralExtra = unicodePathExtra('fallback.txt', 'ünicöde.txt', 'other.txt');
        const out = await extractEntries([{name: 'fallback.txt', data: 'x', noUtf8Flag: true, centralExtra}]);
        assert.strictEqual(await fs.exists(path.resolve(out, 'fallback.txt')), true);
      });
    });

    for (const [title, size] of [
      ['small', 1000],
      ['big', BIG],
    ] as const) {
      for (const method of [0, 8]) {
        const label = `${title} ${method ? 'deflated' : 'stored'}`;
        // Not compressible data would make the small deflated entry bigger than the stored one
        const data = Buffer.from('lorem ipsum '.repeat(Math.ceil(size / 12))).subarray(0, size);

        it(`should extract a ${label} entry`, async function () {
          const out = await extractEntries([
            {name: 'a/f.bin', data, method},
            {name: 'empty', data: ''},
          ]);
          assert.ok(data.equals(await fs.readFile(path.resolve(out, 'a/f.bin'))));
          assert.strictEqual((await fs.stat(path.resolve(out, 'empty'))).size, 0);
        });

        it(`should reject a ${label} entry with a wrong CRC32`, async function () {
          await assert.rejects(extractEntries([{name: 'f.bin', data, method, crc: 1}]), /CRC32 mismatch/);
          assert.strictEqual(await fs.exists(path.resolve(tmpRoot, 'entries-out/f.bin')), false);
        });

        // yauzl itself refuses stored entries with different sizes
        it(`should reject a ${label} entry larger than declared`, {skip: !method}, async function () {
          await assert.rejects(
            extractEntries([{name: 'f.bin', data, method, size: size - 1}]),
            /larger than the declared size/,
          );
        });

        it(`should reject a ${label} entry smaller than declared`, {skip: !method}, async function () {
          await assert.rejects(
            extractEntries([{name: 'f.bin', data, method, size: size + 1}]),
            /bytes were expected|CRC32 mismatch/,
          );
        });

        it(`should keep a file when a ${label} entry replacing it is corrupted`, async function () {
          const out = path.resolve(tmpRoot, 'entries-out');
          await fs.mkdir(out);
          await fs.writeFile(path.resolve(out, 'f.bin'), 'old');
          await assert.rejects(extractEntries([{name: 'f.bin', data, method, crc: 1}]), /CRC32 mismatch/);
          assert.strictEqual(await fs.readFile(path.resolve(out, 'f.bin'), 'utf8'), 'old');
        });
      }
    }

    it('should reject a truncated entry', async function () {
      const archive = path.resolve(tmpRoot, 'truncated.zip');
      await fs.writeFile(archive, buildZip([{name: 'f.bin', data: Buffer.alloc(100, 'a'), method: 0}]));
      const bytes = await fs.readFile(archive);
      // The central directory still claims the whole entry
      const cut = bytes.indexOf(Buffer.from('PK\u0001\u0002'));
      await fs.writeFile(archive, Buffer.concat([bytes.subarray(0, 60), bytes.subarray(cut)]));
      await assert.rejects(zip.extractAllTo(archive, path.resolve(tmpRoot, 'out')));
    });

    it('should name an unsupported compression method', async function () {
      await assert.rejects(
        extractEntries([{name: 'f.bin', data: 'abc', method: 12}]),
        /'f.bin' uses the unsupported compression method bzip2 \(12\)/,
      );
    });

    it('should reject an encrypted entry', async function () {
      await assert.rejects(extractEntries([{name: 'f.bin', data: 'abc', flags: 1}]), /'f.bin' is encrypted/);
    });

    for (const method of [0, 8]) {
      it(
        `should reject a ${method ? 'deflated' : 'stored'} symlink with a wrong CRC32`,
        {skip: isWindows()},
        async function () {
          await assert.rejects(
            extractEntries([
              {name: 'target.txt', data: 'x'},
              {name: 'link', data: 'target.txt', mode: 0o120777, method, crc: 1},
            ]),
            /CRC32 mismatch/,
          );
          assert.strictEqual(await fs.exists(path.resolve(tmpRoot, 'entries-out/link')), false);
        },
      );
    }

    it(
      'should extract a deflated symlink with data after the end of the deflate stream',
      {skip: isWindows()},
      async function () {
        const compressedSize = zlib.deflateRawSync('target.txt').length + 4;
        const out = await extractEntries([
          {name: 'target.txt', data: 'x'},
          {
            name: 'link',
            data: 'target.txt',
            mode: 0o120777,
            method: 8,
            compressedSize,
            junkAfter: Buffer.from('JUNK'),
          },
        ]);
        assert.strictEqual(await fs.readlink(path.resolve(out, 'link')), 'target.txt');
      },
    );

    it('should extract a deflated symlink', {skip: isWindows()}, async function () {
      const out = await extractEntries([
        {name: 'target.txt', data: 'x'},
        {name: 'link', data: 'target.txt', mode: 0o120777, method: 8},
      ]);
      assert.strictEqual(await fs.readlink(path.resolve(out, 'link')), 'target.txt');
    });

    it('should let the last of the entries with the same name win', async function () {
      const entries = Array.from({length: 50}, (_, i): BuildEntry => ({name: 'same.txt', data: `v${i}`}));
      const out = await extractEntries(entries);
      assert.strictEqual(await fs.readFile(path.resolve(out, 'same.txt'), 'utf8'), 'v49');
    });

    it('should extract many files concurrently', async function () {
      const entries = Array.from({length: 300}, (_, i): BuildEntry => ({
        name: `d${i % 7}/f${i}.txt`,
        data: `#${i}`,
      }));
      for (const concurrency of [1, 4, 16]) {
        await fs.rimraf(path.resolve(tmpRoot, 'entries-out'));
        const out = await extractEntries(entries, {concurrency});
        for (const i of [0, 150, 299]) {
          assert.strictEqual(await fs.readFile(path.resolve(out, `d${i % 7}/f${i}.txt`), 'utf8'), `#${i}`);
        }
      }
    });

    it('should stop writing after the first failure', async function () {
      const entries = Array.from({length: 200}, (_, i): BuildEntry => ({name: `f${i}.txt`, data: `#${i}`}));
      entries[20] = {...entries[20], crc: 1};
      await assert.rejects(extractEntries(entries), /CRC32 mismatch/);
      const out = path.resolve(tmpRoot, 'entries-out');
      const written = await fs.readdir(out);
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.deepStrictEqual(await fs.readdir(out), written);
      assert.ok(written.length < 200);
    });

    it('should not start big entries after a file has failed', async function () {
      const data = Buffer.alloc(BIG, 'a');
      const entries: BuildEntry[] = [
        {name: 'bad.txt', data: 'x', crc: 1},
        ...[1, 2, 3].map((i): BuildEntry => ({name: `big${i}.bin`, data, method: 0})),
      ];
      await assert.rejects(extractEntries(entries), /CRC32 mismatch/);
      assert.strictEqual(await fs.exists(path.resolve(tmpRoot, 'entries-out/big3.bin')), false);
    });

    it('should accept data after the end of a deflate stream within the compressed size', async function () {
      const data = Buffer.from('lorem ipsum '.repeat(100));
      const compressedSize = zlib.deflateRawSync(data).length + 4;
      const out = await extractEntries([
        {name: 'padded.txt', data, compressedSize, junkAfter: Buffer.from('JUNK')},
        {name: 'next.txt', data: 'next'},
      ]);
      assert.ok(data.equals(await fs.readFile(path.resolve(out, 'padded.txt'))));
      assert.strictEqual(await fs.readFile(path.resolve(out, 'next.txt'), 'utf8'), 'next');
    });

    it('should accept data after the end of a big deflate stream within the compressed size', async function () {
      const data = Buffer.alloc(BIG, 'a');
      const padding = 100_000;
      const compressedSize = zlib.deflateRawSync(data).length + padding;
      const out = await extractEntries([
        {name: 'padded.bin', data, compressedSize, junkAfter: Buffer.alloc(padding)},
        {name: 'next.txt', data: 'next'},
      ]);
      assert.ok(data.equals(await fs.readFile(path.resolve(out, 'padded.bin'))));
      assert.strictEqual(await fs.readFile(path.resolve(out, 'next.txt'), 'utf8'), 'next');
    });

    it('should not leave a file behind when the input fails while the output is being opened', async function (t) {
      const data = Buffer.from('lorem ipsum '.repeat(Math.ceil(BIG / 12)));
      const archive = path.resolve(tmpRoot, 'bad.zip');
      const out = path.resolve(tmpRoot, 'entries-out');
      await fs.writeFile(archive, buildZip([{name: 'bad.bin', data}]));
      // The compressed content stops after the first bytes: the input fails while the output is not open yet
      const openReadStream = yauzl.ZipFile.prototype.openReadStream;
      t.mock.method(yauzl.ZipFile.prototype, 'openReadStream', function (this: yauzl.ZipFile, ...args: any[]) {
        const callback = args.pop();
        return (openReadStream as any).call(this, ...args, async (err: Error | null, stream: Readable) => {
          if (err) {
            return callback(err);
          }
          const [first] = await stream.toArray();
          const broken = new Readable({read() {}});
          broken.push(first.subarray(0, 2000));
          callback(null, broken);
          setTimeout(() => broken.destroy(new Error('read failed')), 50);
        });
      });
      const openFile = fs.openFile;
      let open = 0;
      t.mock.method(fs, 'openFile', async (...args: Parameters<typeof openFile>) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const handle = await openFile(...args);
        open++;
        const close = handle.close.bind(handle);
        handle.close = async () => {
          open--;
          await close();
        };
        return handle;
      });
      await assert.rejects(zip.extractAllTo(archive, out), /read failed/);
      await new Promise((resolve) => setTimeout(resolve, 400));
      assert.deepStrictEqual(await fs.readdir(out), []);
      assert.strictEqual(open, 0);
    });

    for (const [title, size] of [
      ['small', 100],
      ['big', BIG],
    ] as const) {
      it(`should keep the permissions of a file replaced by a ${title} entry`, {skip: isWindows()}, async function () {
        const out = path.resolve(tmpRoot, 'entries-out');
        await fs.mkdir(out);
        await fs.writeFile(path.resolve(out, 'f.bin'), 'old', {mode: 0o600});
        await fs.chmod(path.resolve(out, 'f.bin'), 0o600);
        await extractEntries([{name: 'f.bin', data: Buffer.alloc(size, 'a'), mode: 0o100755}]);
        assert.strictEqual((await fs.stat(path.resolve(out, 'f.bin'))).size, size);
        assert.strictEqual((await fs.stat(path.resolve(out, 'f.bin'))).mode & 0o777, 0o600);
      });
    }

    it('should cope with unusual concurrency values', async function () {
      const entries = Array.from({length: 40}, (_, i): BuildEntry => ({name: `f${i}.txt`, data: `#${i}`}));
      for (const concurrency of [NaN, Infinity, -3, 0, 2.5]) {
        await fs.rimraf(path.resolve(tmpRoot, 'entries-out'));
        const out = await extractEntries(entries, {concurrency});
        assert.strictEqual(await fs.readFile(path.resolve(out, 'f39.txt'), 'utf8'), '#39');
      }
    });

    it('should not fail because the archive could not be closed', async function (t) {
      t.mock.method(fs, 'close', async () => {
        throw new Error('close failed');
      });
      const out = await extractEntries([{name: 'f.txt', data: 'x'}]);
      assert.strictEqual(await fs.readFile(path.resolve(out, 'f.txt'), 'utf8'), 'x');
    });

    it('should not write through a link created earlier by the same archive', {skip: isWindows()}, async function () {
      const outside = path.resolve(tmpRoot, 'outside');
      await fs.mkdir(outside);
      const entries: BuildEntry[] = [
        {name: 'warmup.txt', data: 'w'},
        {name: 'link', data: outside, mode: 0o120777},
        {name: 'link/pwn.txt', data: 'x'},
      ];
      await assert.rejects(extractEntries(entries), /Out of bound|Cannot|EEXIST/);
      assert.deepStrictEqual(await fs.readdir(outside), []);
    });
  });

  describe('assertValidZip', function () {
    it('should not throw an error if a valid ZIP file is passed', async function () {
      await assert.doesNotReject(zip.assertValidZip(zippedFilePath));
    });
    it('should throw an error if the file does not exist', async function () {
      await assert.rejects(zip.assertValidZip('blabla'));
    });
    it('should throw an error if the file is invalid', async function () {
      await assert.rejects(zip.assertValidZip(path.resolve(assetsPath, 'unzipped', 'test-dir', 'a.txt')));
    });
  });

  describe('readEntries()', function () {
    const expectedEntries: Array<{name: string; contents?: string}> = [
      {name: 'unzipped/'},
      {name: 'unzipped/test-dir/'},
      {name: 'unzipped/test-dir/a.txt', contents: 'Hello World'},
      {name: 'unzipped/test-dir/b.txt', contents: 'Foo Bar'},
    ];

    it('should iterate entries (directories and files) of zip file', async function () {
      let i = 0;
      await zip.readEntries(zippedFilePath, async ({entry, extractEntryTo}) => {
        assert.strictEqual(entry.fileName, expectedEntries[i].name);

        // If it's a file, test that we can extract it to a temporary directory and that the contents are correct.
        if (expectedEntries[i].contents) {
          await extractEntryTo(tmpRoot);
          assert.strictEqual(
            await fs.readFile(path.resolve(tmpRoot, entry.fileName), {
              flag: 'r',
              encoding: 'utf8',
            }),
            expectedEntries[i].contents,
          );
        }
        i++;
      });
    });

    it('should stop iterating zipFile if onEntry callback returns false', async function () {
      let i = 0;

      await zip.readEntries(zippedFilePath, async () => {
        i++;
        return false;
      });
      assert.strictEqual(i, 1);
    });

    it('should be rejected if it uses a non-zip file', async function () {
      const promise = zip.readEntries(path.resolve(assetsPath, 'unzipped', 'test-dir', 'a.txt'), async () => {});
      await assert.rejects(promise);
    });
  });

  describe('toInMemoryZip()', function () {
    it('should convert a local file to an in-memory zip buffer', async function () {
      // Convert directory to in-memory buffer.
      const testFolder = path.resolve(assetsPath, 'unzipped');
      const buffer = await zip.toInMemoryZip(testFolder);
      assert.strictEqual(Buffer.isBuffer(buffer), true);

      // Write the buffer to a zip file.
      await fs.writeFile(path.resolve(tmpRoot, 'test.zip'), buffer);

      // Unzip the file and test that it has the same contents as the directory that was zipped.
      await zip.extractAllTo(path.resolve(tmpRoot, 'test.zip'), path.resolve(tmpRoot, 'output'), {
        fileNamesEncoding: 'utf8',
      });
      assert.strictEqual(
        await fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'a.txt'), {
          encoding: 'utf8',
        }),
        'Hello World',
      );
      assert.strictEqual(
        await fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'b.txt'), {
          encoding: 'utf8',
        }),
        'Foo Bar',
      );
    });

    it('should convert a local folder to an in-memory base64-encoded zip buffer', async function () {
      const testFolder = path.resolve(assetsPath, 'unzipped');
      const buffer = await zip.toInMemoryZip(testFolder, {
        encodeToBase64: true,
      });

      await fs.writeFile(path.resolve(tmpRoot, 'test.zip'), Buffer.from(buffer.toString(), 'base64'));

      // Unzip the file and test that it has the same contents as the directory that was zipped.
      await zip.extractAllTo(path.resolve(tmpRoot, 'test.zip'), path.resolve(tmpRoot, 'output'));
      assert.strictEqual(
        await fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'a.txt'), {
          encoding: 'utf8',
        }),
        'Hello World',
      );
      assert.strictEqual(
        await fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'b.txt'), {
          encoding: 'utf8',
        }),
        'Foo Bar',
      );
    });

    it('should be rejected if use a bad path', async function () {
      await assert.rejects(zip.toInMemoryZip(path.resolve(assetsPath, 'bad_path')), /no such/i);
    });

    it('should be rejected if max size is exceeded', async function () {
      const testFolder = path.resolve(assetsPath, 'unzipped');
      await assert.rejects(
        zip.toInMemoryZip(testFolder, {
          maxSize: 1,
        }),
        /must not be greater/,
      );
    });
  });

  describe('_extractEntryTo()', function () {
    let entry: {fileName: string};
    let destDir: string;
    let mockZipFile: {
      openReadStream: (e: typeof entry, cb: (err: null, s: MockReadWriteStream) => void) => void;
    };
    let mockZipStream: MockReadWriteStream & {pipe?: (dest?: unknown) => void};

    beforeEach(async function () {
      destDir = await tempDir.openDir();
      mockZipStream = new MockReadWriteStream() as MockReadWriteStream & {
        pipe?: (dest?: unknown) => void;
      };
      mockZipFile = {
        // yauzl API is callback-based; we're mocking it.
        /* eslint-disable promise/prefer-await-to-callbacks */
        openReadStream: (e: typeof entry, cb: (err: null, s: MockReadWriteStream) => void) => cb(null, mockZipStream),
        /* eslint-enable promise/prefer-await-to-callbacks */
      };
    });

    it('should be rejected if entry path is outside of destDir', async function () {
      entry = {
        fileName: path.resolve(destDir, '..', 'temp', 'file'),
      };
      await assert.rejects(zip._extractEntryTo(mockZipFile as any, entry as any, destDir), /Out of bound path/);
    });

    it('should be rejected if zip stream emits an error', async function () {
      entry = {
        fileName: path.resolve(destDir, 'temp', 'file'),
      };
      mockZipStream.pipe = () => {
        mockZipStream.emit('error', new Error('zip stream error'));
      };
      await assert.rejects(zip._extractEntryTo(mockZipFile as any, entry as any, destDir), /zip stream error/);
    });

    it('should be rejected if write stream emits an error', async function () {
      entry = {
        fileName: path.resolve(destDir, 'temp', 'file'),
      };
      mockZipStream.pipe = (dest?: unknown) => {
        const writeStream = dest as NodeJS.WritableStream & NodeJS.EventEmitter;
        writeStream.emit('error', new Error('write stream error'));
        mockZipStream.end();
        writeStream.end();
      };
      await assert.rejects(zip._extractEntryTo(mockZipFile as any, entry as any, destDir), /write stream error/);
    });
  });

  describe('toArchive', function () {
    it('should zip all files into an archive', async function () {
      const testFolder = path.resolve(assetsPath, 'unzipped');
      const dstPath = path.resolve(tmpRoot, 'test.zip');
      await zip.toArchive(dstPath, {
        cwd: testFolder,
      });

      // Unzip the file and test that it has the same contents as the directory that was zipped.
      await zip.extractAllTo(dstPath, path.resolve(tmpRoot, 'output'));
      assert.strictEqual(
        await fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'a.txt'), {
          encoding: 'utf8',
        }),
        'Hello World',
      );
      assert.strictEqual(
        await fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'b.txt'), {
          encoding: 'utf8',
        }),
        'Foo Bar',
      );
    });
  });

  describe('unicode filename handling', {skip: isWindows()}, function () {
    let zippedFilePath: string;
    let assetsPath: string;
    let tmpRoot: string;

    beforeEach(async function () {
      assetsPath = await tempDir.openDir();
      tmpRoot = await tempDir.openDir();

      const zippedBase64 =
        'UEsDBBQACAAIABF8/EYAAAAAAAAAABoAAAATACAAa2Fuamkt5q2j5LiW5LiVLmFwcFVUDQAHAgO4VVpX+GBZV/hgdXgLAAEE9QEAAAQUAAAAK8nILFYAorz8EoWi1MScnEqFxDyFxIICLgBQSwcIR93jPhoAAAAaAAAAUEsBAhQDFAAIAAgAEXz8Rkfd4z4aAAAAGgAAABMAIAAAAAAAAAAAAKSBAAAAAGthbmppLeato+S4luS4lS5hcHBVVA0ABwIDuFVaV/hgWVf4YHV4CwABBPUBAAAEFAAAAFBLBQYAAAAAAQABAGEAAAB7AAAAAAA=';
      zippedFilePath = path.resolve(tmpRoot, 'zipped.zip');
      await fs.writeFile(zippedFilePath, zippedBase64, 'base64');
      await zip.extractAllTo(zippedFilePath, assetsPath);
    });

    afterEach(async function () {
      for (const tmpPath of [assetsPath, tmpRoot]) {
        if (!(await fs.exists(tmpPath))) {
          continue;
        }
        await fs.rimraf(tmpPath);
      }
    });

    it('should retain the proper filenames', async function () {
      const expectedPath = path.join(assetsPath, 'kanji-正世丕.app');
      // fs.exists returns a boolean; throw with a clear message if the path is missing.
      if (!(await fs.exists(expectedPath))) {
        throw new Error(`Expected ${expectedPath} to exist, but it does not`);
      }
    });
  });
});

interface StoredZipEntry {
  name: string;
  contents: string;
  mode: number;
  compressionMethod?: number;
}

async function createStoredZip(dstPath: string, entries: StoredZipEntry[]): Promise<void> {
  const chunks: Buffer[] = [];
  const centralDirectory: Buffer[] = [];

  for (const entry of entries) {
    const localHeaderOffset = Buffer.concat(chunks).length;
    const name = Buffer.from(entry.name);
    const utf8Flag = 0x800; // Names are encoded as UTF-8 in both ZIP headers.
    const contents = Buffer.from(entry.contents);
    const crc = crc32(contents);

    chunks.push(
      createZipHeader(30, [
        [0, 0x04034b50, 4],
        [4, 20, 2],
        [6, utf8Flag, 2],
        [8, entry.compressionMethod ?? 0, 2],
        [10, 0, 2],
        [12, 0, 2],
        [14, crc, 4],
        [18, contents.length, 4],
        [22, contents.length, 4],
        [26, name.length, 2],
        [28, 0, 2],
      ]),
      name,
      contents,
    );

    centralDirectory.push(
      createZipHeader(46, [
        [0, 0x02014b50, 4],
        [4, (3 << 8) | 20, 2],
        [6, 20, 2],
        [8, utf8Flag, 2],
        [10, entry.compressionMethod ?? 0, 2],
        [12, 0, 2],
        [14, 0, 2],
        [16, crc, 4],
        [20, contents.length, 4],
        [24, contents.length, 4],
        [28, name.length, 2],
        [30, 0, 2],
        [32, 0, 2],
        [34, 0, 2],
        [36, 0, 2],
        [38, ((entry.mode & 0xffff) << 16) >>> 0, 4],
        [42, localHeaderOffset, 4],
      ]),
      name,
    );
  }

  const fileData = Buffer.concat(chunks);
  const centralDirectoryData = Buffer.concat(centralDirectory);
  const endOfCentralDirectory = createZipHeader(22, [
    [0, 0x06054b50, 4],
    [4, 0, 2],
    [6, 0, 2],
    [8, entries.length, 2],
    [10, entries.length, 2],
    [12, centralDirectoryData.length, 4],
    [16, fileData.length, 4],
    [20, 0, 2],
  ]);

  await fs.writeFile(dstPath, Buffer.concat([fileData, centralDirectoryData, endOfCentralDirectory]));
}

function createZipHeader(size: number, fields: Array<[offset: number, value: number, byteLength: 2 | 4]>): Buffer {
  const header = Buffer.alloc(size);
  for (const [offset, value, byteLength] of fields) {
    if (byteLength === 2) {
      header.writeUInt16LE(value, offset);
    } else {
      header.writeUInt32LE(value, offset);
    }
  }
  return header;
}

function crc32(contents: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of contents) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
