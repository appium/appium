import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import {Readable} from 'node:stream';
import {beforeEach, describe, it} from 'node:test';
import zlib from 'node:zlib';

import {fs} from '../../lib/index.js';
import log from '../../lib/logger.js';
import {isWindows} from '../../lib/system.js';
import * as zip from '../../lib/zip.js';
import {type BuildEntry, buildZip, chunked} from '../zip-builder.js';
import {bigRandom, bigText, DIR, EXEC, FILE, LINK, useStreamFixtures} from '../zip-stream-fixtures.js';

describe('zip.extractStreamTo() safety and failures', function () {
  const {folders, extractBuffer} = useStreamFixtures();
  let tmpRoot: string;
  let out: string;

  beforeEach(function () {
    ({tmpRoot, out} = folders);
  });

  describe('safety', function () {
    const outside = () => path.join(tmpRoot, 'escaped.txt');

    for (const name of ['../escaped.txt', 'a/../../escaped.txt', 'a/b/../../../escaped.txt']) {
      it(`should reject the entry name ${JSON.stringify(name)}`, async function () {
        await assert.rejects(extractBuffer(buildZip([{name, data: 'pwn'}])), /Out of bound path/);
        assert.strictEqual(await fs.exists(outside()), false);
      });
    }

    it('should reject an absolute entry name', {skip: isWindows()}, async function () {
      const target = path.join(tmpRoot, 'absolute.txt');
      await assert.rejects(extractBuffer(buildZip([{name: target, data: 'pwn'}])), /Out of bound path/);
      assert.strictEqual(await fs.exists(target), false);
    });

    it('should reject a name containing a NUL character', async function () {
      await assert.rejects(extractBuffer(buildZip([{name: 'a\u0000b', data: 'x'}])));
    });

    it('should reject writing through a link pointing outside', {skip: isWindows()}, async function () {
      const escape = path.join(tmpRoot, 'escape');
      await fs.mkdir(escape);
      const data = buildZip([
        {name: 'pwn', data: escape, mode: LINK},
        {name: 'pwn/owned.txt', data: 'PWNED', mode: FILE},
      ]);
      await assert.rejects(extractBuffer(data));
      assert.strictEqual(await fs.exists(path.join(escape, 'owned.txt')), false);
    });

    for (const target of ['/etc', '../../outside', '../escaped.txt', 'a/../../escaped.txt']) {
      it(`should reject a link to ${JSON.stringify(target)}`, {skip: isWindows()}, async function () {
        await assert.rejects(
          extractBuffer(buildZip([{name: 'link', data: target, mode: LINK}])),
          /Out of bound symlink target/,
        );
        await assert.rejects(fs.lstat(path.join(out, 'link')), {code: 'ENOENT'});
      });
    }

    for (const existing of [false, true]) {
      it(
        `should reject a link chain to an ${existing ? 'existing' : 'absent'} outside file`,
        {skip: isWindows()},
        async function () {
          if (existing) {
            await fs.writeFile(outside(), 'original');
          }
          const data = buildZip([
            {name: 'd/', mode: DIR},
            {name: 'd/up', data: '..', mode: LINK},
            {name: 'f', data: 'd/up/../escaped.txt', mode: LINK},
          ]);
          await assert.rejects(extractBuffer(data), /Out of bound symlink target/);
          assert.strictEqual(
            existing ? await fs.readFile(outside(), 'utf8') : await fs.exists(outside()),
            existing ? 'original' : false,
          );
        },
      );

      it(
        `should reject a later link redirecting a forward reference (${existing ? 'existing' : 'absent'} target)`,
        {skip: isWindows()},
        async function () {
          if (existing) {
            await fs.writeFile(outside(), 'original');
          }
          const data = buildZip([
            {name: 's/', mode: DIR},
            {name: 'f', data: 's/t/../escaped.txt', mode: LINK},
            {name: 's/t', data: '..', mode: LINK},
          ]);
          await assert.rejects(extractBuffer(data), /Out of bound symlink target/);
          await assert.rejects(fs.lstat(path.join(out, 's/t')), {code: 'ENOENT'});
          assert.strictEqual(
            existing ? await fs.readFile(outside(), 'utf8') : await fs.exists(outside()),
            existing ? 'original' : false,
          );
        },
      );
    }

    it('should reject link cycles', {skip: isWindows()}, async function () {
      await assert.rejects(
        extractBuffer(
          buildZip([
            {name: 'a', data: 'b', mode: LINK},
            {name: 'b', data: 'a', mode: LINK},
          ]),
        ),
        /Too many symlinks/,
      );
    });

    it('should reject a link that is not a small file', {skip: isWindows()}, async function () {
      await assert.rejects(
        extractBuffer(buildZip([{name: 'big', data: 'x'.repeat(70_000), mode: LINK}])),
        /Cannot convert/,
      );
    });

    it(
      'should not turn the entry into a link if the central directory names it differently',
      {skip: isWindows()},
      async function () {
        await extractBuffer(buildZip([{name: 'link', localName: 'file', data: '/etc/passwd', mode: LINK}]));
        const stats = await fs.lstat(path.join(out, 'file'));
        assert.strictEqual(stats.isFile(), true);
        assert.strictEqual(await fs.exists(path.join(out, 'link')), false);
      },
    );

    it('should warn about a link that cannot be matched to its entry', {skip: isWindows()}, async function (t) {
      const warn = t.mock.method(log, 'warn', () => {});
      await extractBuffer(buildZip([{name: 'link', localName: 'file', data: 'target', mode: LINK}]));
      assert.strictEqual(warn.mock.callCount(), 1);
    });

    it(
      'should not change permissions through a link put in place of the file',
      {skip: isWindows()},
      async function (t) {
        const outsidePath = path.join(tmpRoot, 'outside.txt');
        await fs.writeFile(outsidePath, 'outside', {mode: 0o644});
        const swap = async () => {
          await fs.unlink(path.join(out, 'f'));
          await fs.symlink(outsidePath, path.join(out, 'f'));
        };
        let swapped = false;
        const lstat = fs.lstat;
        const openFile = fs.openFile;
        // Whichever way the file is looked up before its permissions are changed, the link appears right then
        t.mock.method(fs, 'lstat', async (target: any) => {
          const result = await lstat(target);
          if (!swapped && target === path.join(out, 'f')) {
            swapped = true;
            await swap();
          }
          return result;
        });
        t.mock.method(fs, 'openFile', async (target: any, flags: any, mode: any) => {
          if (
            !swapped &&
            target === path.join(out, 'f') &&
            flags & fs.constants.O_NOFOLLOW &&
            !(flags & fs.constants.O_CREAT)
          ) {
            swapped = true;
            await swap();
          }
          return await openFile(target, flags, mode);
        });
        await extractBuffer(buildZip([{name: 'f', data: 'x', mode: EXEC}]));
        assert.strictEqual((await fs.stat(outsidePath)).mode & 0o777, 0o644);
      },
    );

    it('should extract entries that are missing in the central directory', async function () {
      await extractBuffer(buildZip([{name: 'hidden.txt', data: 'x', hideFromCentralDirectory: true}]));
      assert.strictEqual(await fs.readFile(path.join(out, 'hidden.txt'), 'utf8'), 'x');
    });

    it(
      'should reject a remembered folder replaced by a link during the extraction',
      {skip: isWindows()},
      async function (t) {
        const outsidePath = path.join(tmpRoot, 'outside');
        await fs.mkdir(outsidePath);
        const data = buildZip([
          {name: 'a/1.txt', data: '1'},
          {name: 'a/2.txt', data: '2'},
          {name: 'a/3.txt', data: '3'},
        ]);
        const openFile = fs.openFile;
        let swapped = false;
        t.mock.method(fs, 'openFile', async (target: any, flags: any, mode: any) => {
          const handle = await openFile(target, flags, mode);
          if (!swapped) {
            // The first file is in place: replace its folder behind the extractor's back
            swapped = true;
            const dirPath = path.join(out, 'a');
            await fs.rename(dirPath, `${dirPath}-moved`);
            await fs.symlink(outsidePath, dirPath);
          }
          return handle;
        });
        await assert.rejects(zip.extractStreamTo(chunked(data, [100]), out, {concurrency: 1}), /Out of bound path/);
        assert.deepStrictEqual(await fs.readdir(outsidePath), []);
      },
    );

    it('should not trust a folder that appeared while it was being created', {skip: isWindows()}, async function (t) {
      const mkdir = fs.mkdir;
      t.mock.method(fs, 'mkdir', async (target: any, opts: any) => {
        if (target === path.join(out, 'a')) {
          // fs.mkdir ignores EEXIST, so the result alone does not tell what is there now
          await fs.symlink('.', target);
        }
        return await mkdir(target, opts);
      });
      const data = buildZip([
        {name: 'a/b/f.txt', data: 'x'},
        {name: 'a/escape', data: '..', mode: LINK},
      ]);
      await assert.rejects(zip.extractStreamTo(chunked(data, [100]), out), /Out of bound symlink target/);
      await assert.rejects(fs.lstat(path.join(out, 'escape')), {code: 'ENOENT'});
    });

    describe('when a folder is replaced after its files were written', {skip: isWindows()}, function () {
      // The folder of the only file is replaced by a link to a folder with a file of the same name
      async function replaceFolderAfterWrite(t: any, name: string, mode: number) {
        const outsidePath = path.join(tmpRoot, 'outside');
        await fs.mkdir(outsidePath);
        await fs.writeFile(path.join(outsidePath, name), 'outside', {mode: 0o644});
        const openFile = fs.openFile;
        let swapped = false;
        t.mock.method(fs, 'openFile', async (target: any, flags: any, fileMode: any) => {
          const handle = await openFile(target, flags, fileMode);
          if (!swapped) {
            swapped = true;
            await fs.rename(path.join(out, 'd'), path.join(out, 'd-moved'));
            await fs.symlink(outsidePath, path.join(out, 'd'));
          }
          return handle;
        });
        const data = buildZip([{name: `d/${name}`, data: 'inside', mode}]);
        await assert.rejects(zip.extractStreamTo(chunked(data, [100]), out), /Out of bound path/);
        return outsidePath;
      }

      it('should not change permissions outside of the root', async function (t) {
        const outsidePath = await replaceFolderAfterWrite(t, 'f', EXEC);
        assert.strictEqual((await fs.stat(path.join(outsidePath, 'f'))).mode & 0o777, 0o644);
      });

      it('should not read or remove files outside of the root', async function (t) {
        const outsidePath = await replaceFolderAfterWrite(t, 'l', LINK);
        assert.strictEqual(await fs.readFile(path.join(outsidePath, 'l'), 'utf8'), 'outside');
      });
    });

    describe('when the folder of a streamed file is replaced during the download', {skip: isWindows()}, function () {
      // The folder is replaced by a link to a folder with a file of the same name; the entry then fails its CRC check
      async function failAfterReplacingFolder(t: any, existing: boolean) {
        const outsidePath = path.join(tmpRoot, 'outside');
        await fs.mkdir(outsidePath);
        await fs.writeFile(path.join(outsidePath, 'f'), 'outside');
        if (existing) {
          await fs.mkdir(path.join(out, 'd'), {recursive: true});
          await fs.writeFile(path.join(out, 'd', 'f'), 'original');
        }
        const openFile = fs.openFile;
        let swapped = false;
        t.mock.method(fs, 'openFile', async (target: any, flags: any, mode: any) => {
          const handle = await openFile(target, flags, mode);
          if (!swapped) {
            swapped = true;
            await fs.rename(path.join(out, 'd'), path.join(out, 'd-moved'));
            await fs.symlink(outsidePath, path.join(out, 'd'));
          }
          return handle;
        });
        const data = buildZip([{name: 'd/f', data: crypto.randomBytes(5_000_000), method: 0, crc: 1}]);
        await assert.rejects(zip.extractStreamTo(chunked(data, [65536]), out), /CRC32 mismatch/);
        return outsidePath;
      }

      it('should not remove a file outside of the root when cleaning up', async function (t) {
        const outsidePath = await failAfterReplacingFolder(t, false);
        assert.strictEqual(await fs.readFile(path.join(outsidePath, 'f'), 'utf8'), 'outside');
      });

      it('should not rename a temporary file into a folder outside of the root', async function (t) {
        const data = buildZip([{name: 'd/f', data: crypto.randomBytes(5_000_000), method: 0}]);
        const outsidePath = path.join(tmpRoot, 'outside');
        await fs.mkdir(outsidePath);
        await fs.mkdir(path.join(out, 'd'), {recursive: true});
        await fs.writeFile(path.join(out, 'd', 'f'), 'original');
        const openFile = fs.openFile;
        let swapped = false;
        t.mock.method(fs, 'openFile', async (target: any, flags: any, mode: any) => {
          const handle = await openFile(target, flags, mode);
          if (!swapped) {
            swapped = true;
            await fs.rename(path.join(out, 'd'), path.join(out, 'd-moved'));
            await fs.symlink(outsidePath, path.join(out, 'd'));
          }
          return handle;
        });
        await assert.rejects(zip.extractStreamTo(chunked(data, [65536]), out), /Out of bound path/);
        assert.deepStrictEqual(await fs.readdir(outsidePath), []);
      });

      it('should keep an existing file outside of the root', async function (t) {
        const outsidePath = await failAfterReplacingFolder(t, true);
        assert.strictEqual(await fs.readFile(path.join(outsidePath, 'f'), 'utf8'), 'outside');
      });
    });

    it(
      'should not create a folder outside of the root below a replaced folder',
      {skip: isWindows()},
      async function (t) {
        const outsidePath = path.join(tmpRoot, 'outside');
        await fs.mkdir(outsidePath);
        const data = buildZip([
          {name: 'a/1.txt', data: '1'},
          {name: 'a/b/2.txt', data: '2'},
        ]);
        const secondEntryAt = data.indexOf(Buffer.from('a/b/2.txt')) - 30;
        const openFile = fs.openFile;
        let swap!: () => void;
        const swapped = new Promise<void>((resolve) => {
          swap = resolve;
        });
        t.mock.method(fs, 'openFile', async (target: any, flags: any, mode: any) => {
          const handle = await openFile(target, flags, mode);
          await fs.rename(path.join(out, 'a'), path.join(out, 'a-moved'));
          await fs.symlink(outsidePath, path.join(out, 'a'));
          swap();
          return handle;
        });
        async function* source() {
          yield data.subarray(0, secondEntryAt);
          await swapped;
          yield data.subarray(secondEntryAt);
        }
        await assert.rejects(zip.extractStreamTo(source(), out, {concurrency: 1}), /Out of bound path/);
        assert.deepStrictEqual(await fs.readdir(outsidePath), []);
      },
    );

    it('should not follow a pre-existing link in the destination', {skip: isWindows()}, async function () {
      await fs.mkdir(out);
      await fs.writeFile(outside(), 'original');
      await fs.symlink(outside(), path.join(out, 'f'));
      await assert.rejects(zip.extractStreamTo(chunked(buildZip([{name: 'f', data: 'replacement'}]), [100]), out));
      assert.strictEqual(await fs.readFile(outside(), 'utf8'), 'original');
    });
  });

  describe('integrity', function () {
    const sample = (entry: Partial<BuildEntry> = {}) => buildZip([{name: 'f', data: bigText, ...entry}]);

    it('should reject a wrong CRC32', async function () {
      await assert.rejects(extractBuffer(sample({crc: 1})), /CRC32 mismatch/);
      await assert.rejects(extractBuffer(sample({crc: 1, method: 0})), /CRC32 mismatch/);
    });

    it('should reject a wrong size', async function () {
      await assert.rejects(extractBuffer(sample({size: 10})), /larger than the declared size/);
      await assert.rejects(extractBuffer(sample({size: bigText.length + 5})), /bytes, but/);
    });

    it('should reject output that expands beyond the declared size', async function () {
      const zeros = Buffer.alloc(5_000_000);
      await assert.rejects(
        extractBuffer(buildZip([{name: 'bomb', data: zeros, size: 100}])),
        /larger than the declared size/,
      );
      assert.strictEqual(await fs.exists(path.join(out, 'bomb')), false);
    });

    it('should keep an existing file if the new content is corrupted', async function () {
      await fs.mkdir(out);
      await fs.writeFile(path.join(out, 'f'), 'original');
      await assert.rejects(
        zip.extractStreamTo(chunked(buildZip([{name: 'f', data: 'new', crc: 1}]), [100]), out),
        /CRC32 mismatch/,
      );
      assert.strictEqual(await fs.readFile(path.join(out, 'f'), 'utf8'), 'original');
    });

    it('should reject a corrupted deflate stream', async function () {
      const data = sample();
      data[100] ^= 0xff;
      await assert.rejects(extractBuffer(data));
    });

    for (const descriptor of ['signature', 'bare'] as const) {
      it(`should reject a mismatching ${descriptor} data descriptor`, async function () {
        await assert.rejects(extractBuffer(sample({descriptor, crc: 1})), /data descriptor/);
        await assert.rejects(extractBuffer(sample({descriptor, size: 1})), /data descriptor/);
        await assert.rejects(extractBuffer(sample({descriptor, compressedSize: 1})), /data descriptor/);
      });
    }

    it('should reject a stored entry with a data descriptor lacking the signature', async function () {
      await assert.rejects(extractBuffer(sample({method: 0, descriptor: 'bare'})), /data descriptor/);
    });

    it('should reject a stored entry whose data descriptor cannot be found', async function () {
      await assert.rejects(extractBuffer(sample({method: 0, descriptor: 'signature', crc: 1})), /data descriptor/);
    });

    it('should reject entries larger than their compressed size field', async function () {
      await assert.rejects(
        extractBuffer(
          buildZip([
            {name: 'f', data: bigText, compressedSize: 10},
            {name: 'g', data: 'x'},
          ]),
        ),
      );
    });

    it('should reject a compressed size that swallows the next entry', async function () {
      const first = zlib.deflateRawSync(bigText).length;
      const data = buildZip([
        {name: 'a.txt', data: bigText, compressedSize: first + 40},
        {name: 'b.txt', data: 'second'},
      ]);
      await assert.rejects(extractBuffer(data), /compressed size is larger than its data/);
    });

    it('should reject every truncation of an archive', async function () {
      const data = buildZip(
        [
          {name: 'dir/', mode: DIR},
          {name: 'a.txt', data: bigText.subarray(0, 300)},
          {name: 'b.bin', data: crypto.randomBytes(120), method: 0, descriptor: 'signature'},
          {name: 'c.txt', data: bigText.subarray(0, 200), descriptor: 'bare'},
          {name: 'd.txt', data: 'zip64', descriptor: 'signature', zip64: true},
          {name: 'link', data: 'a.txt', mode: LINK},
        ],
        {signingBlock: true},
      );
      for (let length = 0; length < data.length; length++) {
        await fs.rimraf(out);
        await assert.rejects(
          zip.extractStreamTo(chunked(data.subarray(0, length), [97]), out),
          /Truncated|not a ZIP archive/,
          `prefix of ${length} bytes`,
        );
      }
      await extractBuffer(data);
    });

    it('should reject an archive cut inside of its comment', async function () {
      const data = buildZip([{name: 'f', data: 'x'}], {comment: 'a comment of the archive'});
      for (const cut of [1, 5, data.length - data.indexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) - 22]) {
        await assert.rejects(extractBuffer(data.subarray(0, data.length - cut)), /Truncated/);
      }
      await extractBuffer(data);
    });

    it('should extract stored data that starts like a data descriptor', async function () {
      const payload = Buffer.concat([Buffer.from('PK\u0007\u0008'), Buffer.alloc(4), Buffer.from('more content')]);
      for (const chunk of [7, 65536]) {
        await extractBuffer(buildZip([{name: 'f', data: payload, method: 0, descriptor: 'signature'}]), [chunk]);
        assert.deepStrictEqual(await fs.readFile(path.join(out, 'f')), payload);
      }
    });

    it('should extract stored data with a lot of false descriptor signatures', async function () {
      const data = Buffer.concat(Array.from({length: 400_000}, () => Buffer.from('PK\u0007\u0008abcd')));
      const started = performance.now();
      const {tree} = await extractBuffer(
        buildZip([{name: 'f', data, method: 0, descriptor: 'signature'}]),
        [2_000_000],
      );
      assert.match(tree[0], new RegExp(`^F f ${data.length}`));
      assert.ok(performance.now() - started < 5000, 'every signature candidate should not rehash the data');
    });

    it('should reject data that is not an archive', async function () {
      await assert.rejects(extractBuffer(Buffer.from('<html>not a zip</html>')), /not a ZIP archive/);
      await assert.rejects(extractBuffer(Buffer.alloc(0)), /not a ZIP archive/);
      await assert.rejects(extractBuffer(Buffer.from('PK')), /not a ZIP archive/);
    });

    it('should reject junk without any further entries', async function () {
      const data = buildZip([{name: 'f', data: 'x'}]);
      const cut = data.subarray(0, data.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])));
      await assert.rejects(
        extractBuffer(Buffer.concat([cut, Buffer.from('trailing junk without signature')])),
        /Truncated/,
      );
    });
  });

  describe('unsupported features', function () {
    it('should name the unsupported compression method', async function () {
      await assert.rejects(
        extractBuffer(buildZip([{name: 'f', data: 'x', method: 12}])),
        (err: Error) =>
          err instanceof zip.ZipStreamUnsupportedError && /bzip2/.test(err.message) && /'f'/.test(err.message),
      );
      await assert.rejects(extractBuffer(buildZip([{name: 'f', data: 'x', method: 93}])), /zstd/);
      await assert.rejects(extractBuffer(buildZip([{name: 'f', data: 'x', method: 77}])), /method 77/);
    });

    it('should reject encrypted entries', async function () {
      await assert.rejects(
        extractBuffer(buildZip([{name: 'f', data: 'x', flags: 1}])),
        (err: Error) => err instanceof zip.ZipStreamUnsupportedError && /encrypted/.test(err.message),
      );
    });
  });

  describe('failures of the source and the destination', function () {
    it('should propagate source errors and stop reading', async function () {
      const data = buildZip([{name: 'f', data: bigRandom, method: 0}]);
      const source = new Readable({
        read() {
          if (this.readableLength === 0 && !this.destroyed) {
            this.push(data.subarray(0, 5000));
            this.destroy(new Error('connection reset'));
          }
        },
      });
      await assert.rejects(zip.extractStreamTo(source, out), /connection reset/);
      assert.strictEqual(source.destroyed, true);
    });

    it('should close the source if the extraction fails', async function () {
      let closed = false;
      const data = buildZip([{name: '../x', data: 'x'}]);
      async function* source() {
        try {
          yield data;
          yield Buffer.alloc(100_000);
        } finally {
          closed = true;
        }
      }
      await assert.rejects(zip.extractStreamTo(source(), out), /Out of bound/);
      assert.strictEqual(closed, true);
    });

    it('should not leave a file behind if the source fails while the file is being opened', async function (t) {
      const first = buildZip([{name: 'big.bin', data: crypto.randomBytes(5_000_000)}]).subarray(0, 1500);
      const openFile = fs.openFile;
      t.mock.method(fs, 'openFile', async (target: any, flags: any, mode: any) => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return await openFile(target, flags, mode);
      });
      async function* source() {
        yield first;
        await new Promise((resolve) => setTimeout(resolve, 30));
        throw new Error('download failed');
      }
      await assert.rejects(zip.extractStreamTo(source(), out), /download failed/);
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.deepStrictEqual(await fs.readdir(out), []);
    });

    describe('with a stalled source', function () {
      // The first part of a big entry arrives, then the download stalls while the file cannot be created
      const stalled = (t: any) => {
        const first = buildZip([{name: 'big.bin', data: crypto.randomBytes(5_000_000)}]).subarray(0, 1500);
        t.mock.method(fs, 'openFile', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          throw new Error('disk failure');
        });
        return first;
      };

      it('should fail without waiting for a stalled stream', {timeout: 10_000}, async function (t) {
        const first = stalled(t);
        let sent = false;
        const source = new Readable({
          read() {
            if (!sent) {
              sent = true;
              this.push(first);
            }
          },
        });
        await assert.rejects(zip.extractStreamTo(source, out), /disk failure/);
        assert.strictEqual(source.destroyed, true);
      });

      it('should fail when a write fails while more data is awaited', {timeout: 10_000}, async function (t) {
        const archive = buildZip([{name: 'f', data: 'x'}]);
        const entry = archive.subarray(0, archive.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])));
        t.mock.method(fs, 'openFile', async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          throw new Error('disk failure');
        });
        async function* source() {
          yield entry;
          await new Promise(() => {});
        }
        await assert.rejects(zip.extractStreamTo(source(), out), /disk failure/);
      });

      it('should fail without waiting for a stalled iterator', {timeout: 10_000}, async function (t) {
        const first = stalled(t);
        async function* source() {
          yield first;
          await new Promise(() => {});
        }
        await assert.rejects(zip.extractStreamTo(source(), out), /disk failure/);
      });
    });

    it('should destroy a readable source if the destination is invalid', async function () {
      const source = chunked(buildZip([]), [100]);
      await assert.rejects(zip.extractStreamTo(source, 'relative/path'), /expected to be absolute/);
      assert.strictEqual(source.destroyed, true);
    });

    it('should fail if the destination cannot be written', {skip: isWindows()}, async function () {
      await fs.writeFile(out, 'a file');
      await assert.rejects(zip.extractStreamTo(chunked(buildZip([{name: 'f', data: 'x'}]), [100]), out));
    });

    it('should not leave a stuck extraction if the writer fails while data is pending', async function () {
      await fs.mkdir(out);
      await fs.writeFile(path.join(out, 'dir'), 'a file in the way');
      const data = buildZip([
        {name: 'dir/f', data: bigRandom, method: 0},
        {name: 'g', data: 'x'},
      ]);
      await assert.rejects(
        zip.extractStreamTo(chunked(data, [1000]), out),
        /Cannot create a directory over existing file/,
      );
    });
  });
});
