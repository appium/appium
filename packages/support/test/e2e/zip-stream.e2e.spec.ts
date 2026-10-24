import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import crypto from 'node:crypto';
import nodeFs from 'node:fs';
import path from 'node:path';
import {beforeEach, describe, it} from 'node:test';
import {promisify} from 'node:util';
import zlib from 'node:zlib';

import {fs} from '../../lib/index.js';
import {isWindows} from '../../lib/system.js';
import * as zip from '../../lib/zip.js';
import {type BuildEntry, type BuildOptions, buildZip, chunked} from '../zip-builder.js';
import {appEntries, bigRandom, bigText, DIR, EXEC, FILE, LINK, useStreamFixtures} from '../zip-stream-fixtures.js';

const execFileAsync = promisify(execFile);

describe('zip.extractStreamTo()', function () {
  const {folders, extractBuffer, referenceTree} = useStreamFixtures();
  let tmpRoot: string;
  let out: string;

  beforeEach(function () {
    ({tmpRoot, out} = folders);
  });

  describe('archive layouts', function () {
    const layouts: Array<[string, (entries: BuildEntry[]) => BuildEntry[], BuildOptions?]> = [
      ['sizes in local headers', (e) => e],
      ['stored entries', (e) => e.map((x) => ({...x, method: 0}))],
      ['data descriptors with signature', (e) => e.map((x) => ({...x, descriptor: 'signature'}))],
      [
        // The end of a stored entry can only be found through the descriptor signature
        'data descriptors without signature (deflate)',
        (e) => e.map((x): BuildEntry => ({...x, descriptor: x.data && x.method !== 0 ? 'bare' : 'none'})),
      ],
      ['stored entries with data descriptors', (e) => e.map((x) => ({...x, method: 0, descriptor: 'signature'}))],
      ['zip64 entries with 64-bit descriptors', (e) => e.map((x) => ({...x, descriptor: 'signature', zip64: true}))],
      ['zip64 entries with sizes in local headers', (e) => e.map((x) => ({...x, zip64: true}))],
      ['APK signing block', (e) => e, {signingBlock: true}],
      ['junk between entries', (e) => e.map((x) => ({...x, junkAfter: Buffer.from('JUNK')}))],
      [
        'junk containing fake signatures',
        (e) => e.map((x) => ({...x, junkAfter: Buffer.from('xPK\u0003xPK\u0001PK\u0005')})),
      ],
      ['archive comment', (e) => e, {comment: 'a comment PK\u0005\u0006 inside'}],
    ];

    for (const [title, tweak, buildOpts] of layouts) {
      describe(title, function () {
        const chunkings: Array<[string, number[]]> = [
          ['whole', [1_000_000_000]],
          ['64 KiB', [65_536]],
          ['4093 bytes', [4093]],
          ['31 bytes', [31]],
          ['uneven', [1, 2, 3, 100, 7, 4000, 13]],
        ];
        for (const [label, sizes] of chunkings) {
          it(`should match extractAllTo (${label} chunks)`, async function () {
            const data = buildZip(tweak(appEntries()), buildOpts);
            const expected = await referenceTree(data);
            const {tree, result} = await extractBuffer(data, sizes);
            assert.deepStrictEqual(tree, expected);
            assert.strictEqual(result.archiveSize, data.length);
          });
        }
      });
    }

    it('should extract byte by byte', async function () {
      const entries = appEntries().map((x): BuildEntry => ({...x, descriptor: 'signature'}));
      entries.push({name: 'stored.bin', data: bigRandom.subarray(0, 3000), method: 0, descriptor: 'signature'});
      const data = buildZip(entries, {signingBlock: true});
      const {tree} = await extractBuffer(data, [1]);
      assert.deepStrictEqual(tree, await referenceTree(data));
    });
  });

  describe('contents', function () {
    it('should extract an empty archive', async function () {
      const {tree, result} = await extractBuffer(buildZip([]));
      assert.deepStrictEqual(tree, []);
      assert.strictEqual(result.archiveSize, 22);
    });

    it('should create the destination folder', async function () {
      const deep = path.join(tmpRoot, 'a', 'b');
      await zip.extractStreamTo(chunked(buildZip([{name: 'f', data: 'x'}]), [100]), deep);
      assert.strictEqual(await fs.readFile(path.join(deep, 'f'), 'utf8'), 'x');
    });

    it('should accept any async iterable of bytes', async function () {
      async function* source() {
        const data = buildZip([{name: 'f', data: 'x'}]);
        yield new Uint8Array(data.subarray(0, 40));
        yield data.subarray(40);
      }
      await zip.extractStreamTo(source(), out);
      assert.strictEqual(await fs.readFile(path.join(out, 'f'), 'utf8'), 'x');
    });

    it('should skip __MACOSX entries', async function () {
      const {tree} = await extractBuffer(
        buildZip([
          {name: '__MACOSX/._f', data: 'x'},
          {name: 'f', data: 'y'},
        ]),
      );
      assert.deepStrictEqual(
        tree.map((line) => line.split(' ')[1]),
        ['f'],
      );
    });

    it('should verify ignored entries too', async function () {
      const data = buildZip([{name: '__MACOSX/._f', data: 'x', crc: 1}]);
      await assert.rejects(extractBuffer(data), /CRC32 mismatch/);
    });

    it('should drain the source up to the end', async function () {
      let finished = false;
      const data = buildZip([{name: 'f', data: 'x'}], {comment: 'trailing comment'});
      async function* source() {
        yield data.subarray(0, 50);
        yield data.subarray(50);
        finished = true;
      }
      const {archiveSize} = await zip.extractStreamTo(source(), out);
      assert.strictEqual(finished, true);
      assert.strictEqual(archiveSize, data.length);
    });

    describe('folders without the trailing slash', function () {
      // bsdtar does not see the central directory of a stream: such entries are files
      it('should extract them as empty files, like bsdtar', async function () {
        await extractBuffer(
          buildZip([
            {name: 'empty', mode: 0o40755},
            {name: 'f', data: 'x'},
          ]),
        );
        assert.strictEqual((await fs.lstat(path.join(out, 'empty'))).isFile(), true);
      });

      it('should fail if the entry has content in a folder, like bsdtar', async function () {
        await assert.rejects(
          extractBuffer(
            buildZip([
              {name: 'd/f', data: 'x'},
              {name: 'd', mode: 0o40755},
            ]),
          ),
        );
        assert.strictEqual(await fs.readFile(path.join(out, 'd', 'f'), 'utf8'), 'x');
      });

      it('should fail for an entry below such a file, like bsdtar', async function () {
        await assert.rejects(
          extractBuffer(
            buildZip([
              {name: 'd', mode: 0o40755},
              {name: 'd/f', data: 'x'},
            ]),
          ),
          /over existing file/,
        );
      });
    });

    describe('file names', function () {
      it('should decode names as UTF-8 by default', async function () {
        const data = buildZip([{name: 'café.txt', data: 'x', noUtf8Flag: true}]);
        const {tree} = await extractBuffer(data);
        assert.match(tree[0], /café\.txt/);
      });

      it('should use the requested encoding for names without the UTF-8 flag', async function () {
        const data = buildZip([{name: 'cafX.txt', data: 'y', noUtf8Flag: true}]);
        // 0xe9 is "\u00e9" in latin1 and an invalid byte in UTF-8
        const patched = Buffer.from(data.toString('latin1').replaceAll('X', '\u00e9'), 'latin1');
        const {tree} = await extractBuffer(patched, [100], {fileNamesEncoding: 'latin1'});
        assert.match(tree[0], /caf\u00e9\.txt/);
        const {tree: fallback} = await extractBuffer(patched, [100]);
        assert.match(fallback[0], /caf\ufffd\.txt/);
      });

      it('should prefer the UTF-8 flag over the requested encoding', async function () {
        const {tree} = await extractBuffer(buildZip([{name: 'café', data: 'x'}]), [100], {
          fileNamesEncoding: 'latin1',
        });
        assert.match(tree[0], /café/);
      });

      it('should use the Info-ZIP unicode path field if it matches the name', async function () {
        const fallback = Buffer.from('fallback.txt');
        const unicode = Buffer.from('ünicöde.txt');
        const extra = Buffer.alloc(4 + 5 + unicode.length);
        extra.writeUInt16LE(0x7075, 0);
        extra.writeUInt16LE(5 + unicode.length, 2);
        extra[4] = 1;
        extra.writeUInt32LE(zlib.crc32(fallback), 5);
        unicode.copy(extra, 9);
        const {tree} = await extractBuffer(
          buildZip([{name: 'fallback.txt', data: 'x', noUtf8Flag: true, localExtra: extra}]),
        );
        assert.match(tree[0], /ünicöde\.txt/);

        extra.writeUInt32LE(0, 5); // not made for this name
        const {tree: ignored} = await extractBuffer(
          buildZip([{name: 'fallback.txt', data: 'x', noUtf8Flag: true, localExtra: extra}]),
        );
        assert.match(ignored[0], /fallback\.txt/);
      });
    });
  });

  describe('permissions and links', {skip: isWindows()}, function () {
    it('should restore executable bits and symlinks from the central directory', async function () {
      await extractBuffer(buildZip(appEntries(), {}), [4096]);
      const app = path.join(out, 'Payload/My.app');
      assert.ok((await fs.stat(path.join(app, 'My'))).mode & 0o100);
      assert.strictEqual(((await fs.stat(path.join(app, 'Info.plist'))).mode & 0o111) !== 0, false);
      const framework = path.join(app, 'Frameworks/F.framework');
      assert.strictEqual(await fs.readlink(path.join(framework, 'Versions/Current')), 'A');
      assert.strictEqual(await fs.readlink(path.join(framework, 'F')), 'Versions/Current/F');
      assert.strictEqual((await fs.readFile(path.join(framework, 'F'))).length, 4000);
    });

    it('should leave plain files if no permissions are stored', async function () {
      const entries: BuildEntry[] = [{name: 'f', data: 'x', mode: 0}];
      await extractBuffer(buildZip(entries, {hostSystem: 0}));
      assert.strictEqual((await fs.stat(path.join(out, 'f'))).isFile(), true);
    });

    it('should ignore modes written by non-Unix hosts', async function () {
      await extractBuffer(buildZip([{name: 'f', data: 'x', mode: LINK}], {hostSystem: 0}));
      assert.strictEqual((await fs.lstat(path.join(out, 'f'))).isFile(), true);
    });

    it('should keep forward references to files extracted later', async function () {
      await extractBuffer(
        buildZip([
          {name: 'Versions/', mode: DIR},
          {name: 'Versions/Current', data: 'A', mode: LINK},
          {name: 'Resources', data: 'Versions/Current/Resources', mode: LINK},
          {name: 'Versions/A/Resources/data', data: 'safe', mode: FILE},
          {name: 'absolute', data: path.join(out, 'Resources/data'), mode: LINK},
        ]),
      );
      assert.strictEqual(await fs.readFile(path.join(out, 'Resources/data'), 'utf8'), 'safe');
      assert.strictEqual(await fs.readFile(path.join(out, 'absolute'), 'utf8'), 'safe');
    });
  });

  describe('writing', function () {
    const many = Array.from({length: 300}, (_, i): BuildEntry => ({
      name: `d${i % 7}/e${i % 3}/f${i}.txt`,
      data: i % 4 ? `content ${i} `.repeat(50) : crypto.randomBytes(500 + i),
      method: i % 5 ? 8 : 0,
      descriptor: i % 3 ? 'signature' : 'none',
    }));

    for (const concurrency of [1, 2, 8, 64]) {
      it(`should extract many files with ${concurrency} writes at a time`, async function () {
        const data = buildZip(many);
        const expected = await referenceTree(data);
        const {tree} = await extractBuffer(data, [8192], {concurrency});
        assert.deepStrictEqual(tree, expected);
      });
    }

    it('should let the last of entries with the same name win', async function () {
      const entries = Array.from({length: 40}, (_, i): BuildEntry => ({name: 'same.txt', data: `version ${i}`}));
      await extractBuffer(buildZip(entries), [4096], {concurrency: 8});
      assert.strictEqual(await fs.readFile(path.join(out, 'same.txt'), 'utf8'), 'version 39');
    });

    it('should not write names differing in case at the same time', async function () {
      const entries = Array.from({length: 40}, (_, i): BuildEntry => ({
        name: i % 2 ? 'Same.txt' : 'same.txt',
        data: `version ${i}`.repeat(100),
      }));
      await extractBuffer(buildZip(entries), [4096], {concurrency: 8});
      // One file on case-insensitive filesystems, two otherwise. Writes must not be interleaved.
      const files = await fs.readdir(out);
      for (const file of files) {
        assert.match(await fs.readFile(path.join(out, file), 'utf8'), /^(version \d+)\1{99}$/);
      }
      if (files.length === 1) {
        assert.match(await fs.readFile(path.join(out, files[0]), 'utf8'), /^(version 39){100}$/);
      }
    });

    for (const [title, method, descriptor] of [
      ['known size, stored', 0, 'none'],
      ['known size, deflate', 8, 'none'],
      ['deflate with a data descriptor', 8, 'signature'],
      ['stored with a data descriptor', 0, 'signature'],
    ] as const) {
      it(`should stream an entry bigger than the memory limit (${title})`, async function () {
        const big = Buffer.concat([crypto.randomBytes(1_000_000), Buffer.alloc(6_000_000, 0x61)]);
        const entries: BuildEntry[] = [
          {name: 'before.txt', data: 'before'},
          {name: 'big.bin', data: big, method, descriptor},
          {name: 'after.txt', data: 'after'},
        ];
        const {tree} = await extractBuffer(buildZip(entries), [65536]);
        assert.deepStrictEqual(
          tree.map((line) => line.split(' ').slice(0, 3).join(' ')),
          [`F after.txt ${5}`, `F before.txt ${6}`, `F big.bin ${big.length}`].map((line) =>
            isWindows() ? line : line,
          ),
        );
        assert.deepStrictEqual(await fs.readFile(path.join(out, 'big.bin')), big);
      });
    }

    it('should keep an existing file if a streamed entry turns out to be corrupted', async function () {
      await fs.mkdir(out);
      await fs.writeFile(path.join(out, 'f'), 'original');
      const big = Buffer.alloc(5_000_000, 0x61);
      await assert.rejects(
        zip.extractStreamTo(chunked(buildZip([{name: 'f', data: big, crc: 1}]), [65536]), out),
        /CRC32 mismatch/,
      );
      assert.strictEqual(await fs.readFile(path.join(out, 'f'), 'utf8'), 'original');
      assert.deepStrictEqual(await fs.readdir(out), ['f']);

      await zip.extractStreamTo(chunked(buildZip([{name: 'f', data: big}]), [65536]), out);
      assert.deepStrictEqual(await fs.readFile(path.join(out, 'f')), big);
      assert.deepStrictEqual(await fs.readdir(out), ['f']);
    });

    it('should not leave a partly written streamed entry behind', async function () {
      const data = buildZip([{name: 'big.bin', data: crypto.randomBytes(5_000_000), method: 0}]);
      await assert.rejects(zip.extractStreamTo(chunked(data.subarray(0, 100_000), [65536]), out), /Truncated/);
      assert.deepStrictEqual(await fs.readdir(out), []);
    });

    it('should let a later entry replace an earlier link', {skip: isWindows()}, async function () {
      await extractBuffer(
        buildZip([
          {name: 'x', data: 'a', mode: LINK},
          {name: 'x', data: 'payload', mode: FILE},
        ]),
      );
      const stats = await fs.lstat(path.join(out, 'x'));
      assert.strictEqual(stats.isFile(), true);
      assert.strictEqual(await fs.readFile(path.join(out, 'x'), 'utf8'), 'payload');
    });

    it('should use the last of links with the same name', {skip: isWindows()}, async function () {
      await extractBuffer(
        buildZip([
          {name: 'x', data: 'a', mode: LINK},
          {name: 'x', data: 'b', mode: LINK},
        ]),
      );
      assert.strictEqual(await fs.readlink(path.join(out, 'x')), 'b');
    });

    it('should apply file permissions before restrictive folder permissions', {skip: isWindows()}, async function () {
      const data = buildZip([
        {name: 'd/', mode: 0o40600},
        {name: 'd/e/', mode: 0o40500},
        {name: 'd/e/f', data: 'x', mode: EXEC},
      ]);
      await zip.extractStreamTo(chunked(data, [100]), out);
      const folder = path.join(out, 'd');
      assert.strictEqual((await fs.stat(folder)).mode & 0o777, 0o600 & ~process.umask());
      await fs.chmod(folder, 0o700);
      await fs.chmod(path.join(folder, 'e'), 0o700);
      assert.strictEqual((await fs.stat(path.join(folder, 'e/f'))).mode & 0o777, 0o755 & ~process.umask());
    });

    it('should not write one file through two names at the same time', {skip: isWindows()}, async function () {
      await fs.mkdir(path.join(out, 'real'), {recursive: true});
      await fs.symlink('real', path.join(out, 'alias'));
      const entries = Array.from({length: 40}, (_, i): BuildEntry => ({
        name: i % 2 ? 'alias/f' : 'real/f',
        data: `${i}:`.repeat(20_000),
      }));
      await zip.extractStreamTo(chunked(buildZip(entries), [8192]), out, {concurrency: 8});
      assert.strictEqual(await fs.readFile(path.join(out, 'real/f'), 'utf8'), '39:'.repeat(20_000));
    });

    it('should reject a remembered folder link whose target was replaced', {skip: isWindows()}, async function (t) {
      const outsidePath = path.join(tmpRoot, 'outside');
      await fs.mkdir(outsidePath);
      await fs.mkdir(path.join(out, 'real'), {recursive: true});
      await fs.symlink('real', path.join(out, 'alias'));
      const data = buildZip([
        {name: 'alias/1.txt', data: '1'},
        {name: 'alias/2.txt', data: '2'},
      ]);
      const openFile = fs.openFile;
      let swapped = false;
      t.mock.method(fs, 'openFile', async (target: any, flags: any, mode: any) => {
        const handle = await openFile(target, flags, mode);
        if (!swapped) {
          swapped = true;
          const realPath = path.join(out, 'real');
          await fs.rename(realPath, `${realPath}-moved`);
          await fs.symlink(outsidePath, realPath);
        }
        return handle;
      });
      await assert.rejects(zip.extractStreamTo(chunked(data, [100]), out, {concurrency: 1}), /Out of bound path/);
      assert.deepStrictEqual(await fs.readdir(outsidePath), []);
    });

    it('should keep the permissions and links of names differing in case', {skip: isWindows()}, async function () {
      await fs.mkdir(tmpRoot, {recursive: true});
      await fs.writeFile(path.join(tmpRoot, 'probe'), '');
      const caseInsensitive = await fs.exists(path.join(tmpRoot, 'PROBE'));
      await extractBuffer(
        buildZip([
          {name: 'Run', data: 'a', mode: EXEC},
          {name: 'run', data: 'b', mode: EXEC},
          {name: 'Lnk', data: 'target', mode: LINK},
          {name: 'lnk', data: 'plain', mode: FILE},
        ]),
      );
      const executable = async (name: string) => ((await fs.stat(path.join(out, name))).mode & 0o100) !== 0;
      assert.strictEqual(await executable('run'), true);
      if (caseInsensitive) {
        assert.strictEqual((await fs.lstat(path.join(out, 'lnk'))).isFile(), true);
      } else {
        assert.strictEqual(await executable('Run'), true);
        assert.strictEqual(await fs.readlink(path.join(out, 'Lnk')), 'target');
        assert.strictEqual(await fs.readFile(path.join(out, 'lnk'), 'utf8'), 'plain');
      }
    });

    it('should replace a file with a very long name by a streamed entry', async function () {
      const name = `${'n'.repeat(240)}.bin`;
      await fs.mkdir(out);
      await fs.writeFile(path.join(out, name), 'original');
      const big = Buffer.alloc(5_000_000, 0x62);
      await zip.extractStreamTo(chunked(buildZip([{name, data: big}]), [65536]), out);
      assert.deepStrictEqual(await fs.readFile(path.join(out, name)), big);
      assert.deepStrictEqual(await fs.readdir(out), [name]);
    });

    it('should apply an explicit mode without permission bits', {skip: isWindows()}, async function () {
      const data = buildZip([
        {name: 'd/', mode: 0o40000},
        {name: 'd/f', data: 'x', mode: 0o100000},
        {name: 'g', data: 'y', mode: 0o100000},
      ]);
      await zip.extractStreamTo(chunked(data, [100]), out);
      try {
        assert.strictEqual((await fs.stat(path.join(out, 'g'))).mode & 0o777, 0);
        assert.strictEqual((await fs.stat(path.join(out, 'd'))).mode & 0o777, 0);
      } finally {
        await fs.chmod(path.join(out, 'd'), 0o700);
      }
      assert.strictEqual((await fs.stat(path.join(out, 'd/f'))).mode & 0o777, 0);
    });

    it('should keep the permissions of the destination folder', {skip: isWindows()}, async function () {
      await fs.mkdir(out);
      await fs.chmod(out, 0o755);
      const data = buildZip([
        {name: './', mode: 0o40700},
        {name: 'f', data: 'x'},
      ]);
      await zip.extractStreamTo(chunked(data, [100]), out);
      assert.strictEqual((await fs.stat(out)).mode & 0o777, 0o755);
    });

    it('should replace read-only files', {skip: isWindows()}, async function () {
      await fs.mkdir(out);
      await fs.writeFile(path.join(out, 'f'), 'original', {mode: 0o444});
      await zip.extractStreamTo(chunked(buildZip([{name: 'f', data: 'new'}]), [100]), out);
      assert.strictEqual(await fs.readFile(path.join(out, 'f'), 'utf8'), 'new');
    });

    it('should report a failure of a pending write', {skip: isWindows()}, async function () {
      await fs.mkdir(path.join(out, 'taken'), {recursive: true});
      const entries: BuildEntry[] = [
        ...Array.from({length: 20}, (_, i): BuildEntry => ({name: `ok${i}.txt`, data: `ok ${i}`})),
        {name: 'taken', data: 'a file where a folder is'},
        ...Array.from({length: 20}, (_, i): BuildEntry => ({name: `late${i}.txt`, data: `late ${i}`})),
      ];
      await assert.rejects(zip.extractStreamTo(chunked(buildZip(entries), [512]), out), /EISDIR|EEXIST|directory/i);
    });
  });

  describe('backpressure', function () {
    it('should read the source only as fast as the data is written', async function () {
      const chunkSize = 64 * 1024;
      const total = 32 * 1024 * 1024;
      const payloadCrc = crc32Of(chunkSize, total);
      const header = buildZip([{name: 'big.bin', data: '', method: 0}]);
      // Local header of an empty entry, patched to describe the big stored entry
      const local = Buffer.from(header.subarray(0, 30 + 'big.bin'.length));
      local.writeUInt32LE(payloadCrc, 14);
      local.writeUInt32LE(total, 18);
      local.writeUInt32LE(total, 22);
      const tail = buildZip([]).subarray(0); // end of central directory
      const target = path.join(out, 'big.bin');
      let maxLag = 0;

      async function* source() {
        yield local;
        const chunk = Buffer.alloc(chunkSize, 0x61);
        for (let produced = 0; produced < total; produced += chunkSize) {
          let written = 0;
          try {
            written = nodeFs.statSync(target).size;
          } catch {
            // not created yet
          }
          maxLag = Math.max(maxLag, produced - written);
          yield chunk;
        }
        yield tail;
      }

      await zip.extractStreamTo(source(), out);
      assert.strictEqual((await fs.stat(target)).size, total);
      // Without backpressure the whole 32 MiB would be read before the disk catches up
      assert.ok(maxLag < 4 * 1024 * 1024, `the source ran ahead of the writer by ${maxLag} bytes`);
    });
  });

  describe('archives created by other tools', {skip: isWindows()}, function () {
    let tree: string;

    beforeEach(async function () {
      tree = path.join(tmpRoot, 'tree');
      const app = path.join(tree, 'Payload/My.app');
      await fs.mkdir(path.join(app, 'Frameworks/F.framework/Versions/A'), {recursive: true});
      await fs.mkdir(path.join(app, 'empty-dir'));
      await fs.writeFile(path.join(app, 'My'), bigRandom, {mode: 0o755});
      await fs.chmod(path.join(app, 'My'), 0o755);
      await fs.writeFile(path.join(app, 'Info.plist'), bigText);
      await fs.writeFile(path.join(app, 'café-日本.txt'), 'unicode');
      await fs.writeFile(path.join(app, 'Frameworks/F.framework/Versions/A/F'), bigRandom.subarray(0, 5000));
      await fs.symlink('A', path.join(app, 'Frameworks/F.framework/Versions/Current'));
      await fs.symlink('Versions/Current/F', path.join(app, 'Frameworks/F.framework/F'));
    });

    const tools: Array<[string, string, (archive: string, cwd: string) => string[]]> = [
      ['zip', 'zip', (archive) => ['-qry', archive, '.']],
      ['ditto', 'ditto', (archive) => ['-c', '-k', '--keepParent', path.join(tmpRoot, 'tree/Payload'), archive]],
      ['bsdtar', 'bsdtar', (archive) => ['--format', 'zip', '-cf', archive, '.']],
    ];

    for (const [title, command, args] of tools) {
      for (const [label, sizes] of [
        ['whole', [1_000_000_000]],
        ['small', [211]],
      ] as const) {
        it(`should match extractAllTo for an archive made by ${title} (${label} chunks)`, async function (t) {
          const archive = path.join(tmpRoot, `${title}.zip`);
          try {
            await execFileAsync(command, args(archive, tree), {cwd: tree});
          } catch (err: any) {
            if (err.code === 'ENOENT') {
              t.skip(`${command} is not available`);
              return;
            }
            throw err;
          }
          const data = await fs.readFile(archive);
          const expected = await referenceTree(data);
          const {tree: actual} = await extractBuffer(data, [...sizes]);
          assert.deepStrictEqual(actual, expected);
        });
      }
    }
  });
});

/** CRC32 of `total` bytes of 0x61 produced in `chunkSize` pieces */
function crc32Of(chunkSize: number, total: number): number {
  const chunk = Buffer.alloc(chunkSize, 0x61);
  let crc = 0;
  for (let done = 0; done < total; done += chunkSize) {
    crc = zlib.crc32(chunk, crc);
  }
  return crc;
}
