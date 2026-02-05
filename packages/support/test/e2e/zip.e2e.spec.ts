import path from 'node:path';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as chai from 'chai';
import * as zip from '../../lib/zip';
import {tempDir, fs} from '../../lib/index';
import {MockReadWriteStream} from '../helpers';
import {isWindows} from '../../lib/system';

describe('#zip', function () {
  const optionMap = new Map<string, Record<string, boolean | undefined>>([
    ['native JS unzip', {}],
    ['system unzip', {useSystemUnzip: true}],
  ]);

  before(async function () {
    use(chaiAsPromised);
    chai.should();
  });

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
          await expect(
            fs.readFile(path.resolve(assetsPath, 'unzipped', 'test-dir', 'a.txt'), {
              encoding: 'utf8',
            })
          ).to.eventually.equal('Hello World');
          await expect(
            fs.readFile(path.resolve(assetsPath, 'unzipped', 'test-dir', 'b.txt'), {
              encoding: 'utf8',
            })
          ).to.eventually.equal('Foo Bar');
        });
      });

      describe('assertValidZip', function () {
        it('should not throw an error if a valid ZIP file is passed', async function () {
          await expect(zip.assertValidZip(zippedFilePath)).to.eventually.be.fulfilled;
        });
        it('should throw an error if the file does not exist', async function () {
          await expect(zip.assertValidZip('blabla')).to.eventually.be.rejected;
        });
        it('should throw an error if the file is invalid', async function () {
          await expect(
            zip.assertValidZip(path.resolve(assetsPath, 'unzipped', 'test-dir', 'a.txt'))
          ).to.eventually.be.rejected;
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
            expect(entry.fileName).to.equal(expectedEntries[i].name);

            if (expectedEntries[i].contents) {
              await extractEntryTo(tmpRoot);
              await expect(
                fs.readFile(path.resolve(tmpRoot, entry.fileName), {
                  flag: 'r',
                  encoding: 'utf8',
                })
              ).to.eventually.equal(expectedEntries[i].contents);
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
          expect(i).to.equal(1);
        });

        it('should be rejected if it uses a non-zip file', async function () {
          const promise = zip.readEntries(
            path.resolve(assetsPath, 'unzipped', 'test-dir', 'a.txt'),
            async () => {}
          );
          await expect(promise).to.eventually.be.rejected;
        });
      });

      describe('toInMemoryZip()', function () {
        it('should convert a local file to an in-memory zip buffer', async function () {
          const testFolder = path.resolve(assetsPath, 'unzipped');
          const buffer = await zip.toInMemoryZip(testFolder);
          expect(Buffer.isBuffer(buffer)).to.be.true;

          await fs.writeFile(path.resolve(tmpRoot, 'test.zip'), buffer);

          await zip.extractAllTo(
            path.resolve(tmpRoot, 'test.zip'),
            path.resolve(tmpRoot, 'output'),
            {
              fileNamesEncoding: 'utf8',
            }
          );
          await expect(
            fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'a.txt'), {
              encoding: 'utf8',
            })
          ).to.eventually.equal('Hello World');
          await expect(
            fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'b.txt'), {
              encoding: 'utf8',
            })
          ).to.eventually.equal('Foo Bar');
        });

        it('should convert a local folder to an in-memory base64-encoded zip buffer', async function () {
          const testFolder = path.resolve(assetsPath, 'unzipped');
          const buffer = await zip.toInMemoryZip(testFolder, {
            encodeToBase64: true,
          });

          await fs.writeFile(
            path.resolve(tmpRoot, 'test.zip'),
            Buffer.from(buffer.toString(), 'base64')
          );

          await zip.extractAllTo(
            path.resolve(tmpRoot, 'test.zip'),
            path.resolve(tmpRoot, 'output')
          );
          await expect(
            fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'a.txt'), {
              encoding: 'utf8',
            })
          ).to.eventually.equal('Hello World');
          await expect(
            fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'b.txt'), {
              encoding: 'utf8',
            })
          ).to.eventually.equal('Foo Bar');
        });

        it('should be rejected if use a bad path', async function () {
          await expect(
            zip.toInMemoryZip(path.resolve(assetsPath, 'bad_path'))
          ).to.be.rejectedWith(/no such/i);
        });

        it('should be rejected if max size is exceeded', async function () {
          const testFolder = path.resolve(assetsPath, 'unzipped');
          await expect(
            zip.toInMemoryZip(testFolder, {
              maxSize: 1,
            })
          ).to.be.rejectedWith(/must not be greater/);
        });
      });

      describe('_extractEntryTo()', function () {
        let entry: {fileName: string};
        let destDir: string;
        let mockZipFile: {openReadStream: (e: typeof entry, cb: (err: null, s: MockReadWriteStream) => void) => void};
        let mockZipStream: MockReadWriteStream & {pipe?: (dest?: unknown) => void};

        beforeEach(async function () {
          destDir = await tempDir.openDir();
          entry = {
            fileName: path.resolve(destDir, 'temp', 'file'),
          };
          mockZipStream = new MockReadWriteStream() as MockReadWriteStream & {
            pipe?: (dest?: unknown) => void;
          };
          mockZipFile = {
            openReadStream: (e: typeof entry, cb: (err: null, s: MockReadWriteStream) => void) =>
              cb(null, mockZipStream),
          };
        });

        it('should be rejected if zip stream emits an error', async function () {
          mockZipStream.pipe = () => {
            mockZipStream.emit('error', new Error('zip stream error'));
          };
          await expect(
            zip._extractEntryTo(mockZipFile as any, entry as any, destDir)
          ).to.be.rejectedWith('zip stream error');
        });

        it('should be rejected if write stream emits an error', async function () {
          mockZipStream.pipe = (writeStream: NodeJS.WritableStream & NodeJS.EventEmitter) => {
            writeStream.emit('error', new Error('write stream error'));
            mockZipStream.end();
            writeStream.end();
          };
          await expect(
            zip._extractEntryTo(mockZipFile as any, entry as any, destDir)
          ).to.be.rejectedWith('write stream error');
        });
      });

      describe('toArchive', function () {
        it('should zip all files into an archive', async function () {
          const testFolder = path.resolve(assetsPath, 'unzipped');
          const dstPath = path.resolve(tmpRoot, 'test.zip');
          await zip.toArchive(dstPath, {
            cwd: testFolder,
          });

          await zip.extractAllTo(dstPath, path.resolve(tmpRoot, 'output'));
          await expect(
            fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'a.txt'), {
              encoding: 'utf8',
            })
          ).to.eventually.equal('Hello World');
          await expect(
            fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'b.txt'), {
              encoding: 'utf8',
            })
          ).to.eventually.equal('Foo Bar');
        });
      });
    });
  });

  describe('unicode filename handling', function () {
    let zippedFilePath: string;
    let assetsPath: string;
    let tmpRoot: string;

    beforeEach(async function () {
      if (isWindows()) {
        return this.skip();
      }
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
      if (!(await fs.exists(expectedPath))) {
        throw new Error(`Expected ${expectedPath} to exist, but it does not`);
      }
    });
  });
});
