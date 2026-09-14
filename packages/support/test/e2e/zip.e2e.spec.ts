import assert from 'node:assert/strict';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {fs, tempDir} from '../../lib/index.js';
import {isWindows} from '../../lib/system.js';
import * as zip from '../../lib/zip.js';
import {MockReadWriteStream} from '../helpers.js';

describe('#zip', function () {
  const optionMap = new Map<string, Record<string, boolean | undefined>>([
    ['native JS unzip', {}],
    ['system unzip', {useSystemUnzip: true}],
  ]);

  optionMap.forEach((options, desc) => {
    describe(desc, function () {
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
        await zip.extractAllTo(zippedFilePath, assetsPath, options);
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

            await assert.rejects(zip.extractAllTo(dstPath, outputPath, options), /Out of bound/);
            if (!options.useSystemUnzip) {
              assert.strictEqual(await fs.exists(path.resolve(outputPath, 'pwn')), false);
            }
            assert.strictEqual(await fs.exists(path.resolve(escapePath, 'owned.txt')), false);
          },
        );
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
            openReadStream: (e: typeof entry, cb: (err: null, s: MockReadWriteStream) => void) =>
              cb(null, mockZipStream),
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
      await zip.extractAllTo(zippedFilePath, assetsPath, {
        useSystemUnzip: true,
      });
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
}

async function createStoredZip(dstPath: string, entries: StoredZipEntry[]): Promise<void> {
  const chunks: Buffer[] = [];
  const centralDirectory: Buffer[] = [];

  for (const entry of entries) {
    const localHeaderOffset = Buffer.concat(chunks).length;
    const name = Buffer.from(entry.name);
    const contents = Buffer.from(entry.contents);
    const crc = crc32(contents);

    chunks.push(
      createZipHeader(30, [
        [0, 0x04034b50, 4],
        [4, 20, 2],
        [6, 0, 2],
        [8, 0, 2],
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
        [8, 0, 2],
        [10, 0, 2],
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
