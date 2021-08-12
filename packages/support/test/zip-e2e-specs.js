import path from 'path';
import * as zip from '../lib/zip';
import { tempDir, fs } from '../index';
import { MockReadWriteStream } from './helpers';


describe('#zip', function () {

  const optionMap = new Map([['native JS unzip', {}], ['system unzip', {useSystemUnzip: true}]]);

  optionMap.forEach((options, desc) => {
    describe(desc, function () {
      let assetsPath;
      let zippedFilePath;
      let tmpRoot;

      beforeEach(async function () {
        assetsPath = await tempDir.openDir();
        tmpRoot = await tempDir.openDir();
        const zippedBase64 = 'UEsDBAoAAAAAALlzk0oAAAAAAAAAAAAAAAAJABAAdW56aXBwZWQvVVgMANBO+VjO1vdY9QEUAFBLAwQKAAAAAADAc5NKAAAAAAAAAAAAAAAAEgAQAHVuemlwcGVkL3Rlc3QtZGlyL1VYDADQTvlY19b3WPUBFABQSwMEFAAIAAgAwnOTSgAAAAAAAAAAAAAAABcAEAB1bnppcHBlZC90ZXN0LWRpci9hLnR4dFVYDACDTvlY3Nb3WPUBFADzSM3JyVcIzy/KSQEAUEsHCFaxF0oNAAAACwAAAFBLAwQUAAgACADEc5NKAAAAAAAAAAAAAAAAFwAQAHVuemlwcGVkL3Rlc3QtZGlyL2IudHh0VVgMAINO+Vjf1vdY9QEUAHPLz1dwSiwCAFBLBwhIfrZJCQAAAAcAAABQSwECFQMKAAAAAAC5c5NKAAAAAAAAAAAAAAAACQAMAAAAAAAAAABA7UEAAAAAdW56aXBwZWQvVVgIANBO+VjO1vdYUEsBAhUDCgAAAAAAwHOTSgAAAAAAAAAAAAAAABIADAAAAAAAAAAAQO1BNwAAAHVuemlwcGVkL3Rlc3QtZGlyL1VYCADQTvlY19b3WFBLAQIVAxQACAAIAMJzk0pWsRdKDQAAAAsAAAAXAAwAAAAAAAAAAECkgXcAAAB1bnppcHBlZC90ZXN0LWRpci9hLnR4dFVYCACDTvlY3Nb3WFBLAQIVAxQACAAIAMRzk0pIfrZJCQAAAAcAAAAXAAwAAAAAAAAAAECkgdkAAAB1bnppcHBlZC90ZXN0LWRpci9iLnR4dFVYCACDTvlY39b3WFBLBQYAAAAABAAEADEBAAA3AQAAAAA=';
        zippedFilePath = path.resolve(tmpRoot, 'zipped.zip');
        await fs.writeFile(zippedFilePath, zippedBase64, 'base64');
        await zip.extractAllTo(zippedFilePath, assetsPath, options);
      });

      afterEach(async function () {
        for (const tmpPath of [assetsPath, tmpRoot]) {
          if (!await fs.exists(tmpPath)) {
            continue;
          }
          await fs.rimraf(tmpPath);
        }
      });

      describe('extractAllTo()', function () {
        it('should extract contents of a .zip file to a directory', async function () {
          await fs.readFile(path.resolve(assetsPath, 'unzipped', 'test-dir', 'a.txt'), {encoding: 'utf8'}).should.eventually.equal('Hello World');
          await fs.readFile(path.resolve(assetsPath, 'unzipped', 'test-dir', 'b.txt'), {encoding: 'utf8'}).should.eventually.equal('Foo Bar');
        });
      });

      describe('assertValidZip', function () {
        it('should not throw an error if a valid ZIP file is passed', async function () {
          await zip.assertValidZip(zippedFilePath).should.eventually.be.fulfilled;
        });
        it('should throw an error if the file does not exist', async function () {
          await zip.assertValidZip('blabla').should.eventually.be.rejected;
        });
        it('should throw an error if the file is invalid', async function () {
          await zip.assertValidZip(path.resolve(assetsPath, 'unzipped', 'test-dir', 'a.txt')).should.eventually.be.rejected;
        });
      });

      describe('readEntries()', function () {
        const expectedEntries = [
          {name: 'unzipped/'},
          {name: 'unzipped/test-dir/'},
          {name: 'unzipped/test-dir/a.txt', contents: 'Hello World'},
          {name: 'unzipped/test-dir/b.txt', contents: 'Foo Bar'},
        ];

        it('should iterate entries (directories and files) of zip file', async function () {
          let i = 0;
          await zip.readEntries(zippedFilePath, async ({entry, extractEntryTo}) => {
            entry.fileName.should.equal(expectedEntries[i].name);

            // If it's a file, test that we can extract it to a temporary directory and that the contents are correct
            if (expectedEntries[i].contents) {
              await extractEntryTo(tmpRoot);
              await fs.readFile(path.resolve(tmpRoot, entry.fileName), {
                flags: 'r',
                encoding: 'utf8'
              }).should.eventually.equal(expectedEntries[i].contents);
            }
            i++;
          });
        });

        it('should stop iterating zipFile if onEntry callback returns false', async function () {
          let i = 0;
          await zip.readEntries(zippedFilePath, async () => { // eslint-disable-line require-await
            i++;
            return false;
          });
          i.should.equal(1);
        });

        it('should be rejected if it uses a non-zip file', async function () {
          let promise = zip.readEntries(path.resolve(assetsPath, 'unzipped', 'test-dir', 'a.txt'), async () => {});
          await promise.should.eventually.be.rejected;
        });
      });

      describe('toInMemoryZip()', function () {
        it('should convert a local file to an in-memory zip buffer', async function () {
          // Convert directory to in-memory buffer
          const testFolder = path.resolve(assetsPath, 'unzipped');
          const buffer = await zip.toInMemoryZip(testFolder);
          Buffer.isBuffer(buffer).should.be.true;

          // Write the buffer to a zip file
          await fs.writeFile(path.resolve(tmpRoot, 'test.zip'), buffer);

          // Unzip the file and test that it has the same contents as the directory that was zipped
          await zip.extractAllTo(path.resolve(tmpRoot, 'test.zip'), path.resolve(tmpRoot, 'output'), {
            fileNamesEncoding: 'utf8'
          });
          await fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'a.txt'), {
            encoding: 'utf8'
          }).should.eventually.equal('Hello World');
          await fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'b.txt'), {
            encoding: 'utf8'
          }).should.eventually.equal('Foo Bar');
        });

        it('should convert a local folder to an in-memory base64-encoded zip buffer', async function () {
          const testFolder = path.resolve(assetsPath, 'unzipped');
          const buffer = await zip.toInMemoryZip(testFolder, {
            encodeToBase64: true,
          });

          await fs.writeFile(path.resolve(tmpRoot, 'test.zip'), Buffer.from(buffer.toString(), 'base64'));

          // Unzip the file and test that it has the same contents as the directory that was zipped
          await zip.extractAllTo(path.resolve(tmpRoot, 'test.zip'), path.resolve(tmpRoot, 'output'));
          await fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'a.txt'), {
            encoding: 'utf8'
          }).should.eventually.equal('Hello World');
          await fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'b.txt'), {
            encoding: 'utf8'
          }).should.eventually.equal('Foo Bar');
        });

        it('should be rejected if use a bad path', async function () {
          await zip.toInMemoryZip(path.resolve(assetsPath, 'bad_path'))
            .should.be.rejectedWith(/no such/i);
        });

        it('should be rejected if max size is exceeded', async function () {
          const testFolder = path.resolve(assetsPath, 'unzipped');
          await zip.toInMemoryZip(testFolder, {
            maxSize: 1,
          }).should.be.rejectedWith(/must not be greater/);
        });
      });

      describe('_extractEntryTo()', function () {
        let entry, mockZipFile, mockZipStream;
        beforeEach(async function () {
          entry = {fileName: path.resolve(await tempDir.openDir(), 'temp', 'file')};
          mockZipStream = new MockReadWriteStream();
          mockZipFile = {
            openReadStream: (entry, cb) => cb(null, mockZipStream), // eslint-disable-line promise/prefer-await-to-callbacks
          };
        });

        it('should be rejected if zip stream emits an error', async function () {
          mockZipStream.pipe = () => {
            mockZipStream.emit('error', new Error('zip stream error'));
          };
          await zip._extractEntryTo(mockZipFile, entry).should.be.rejectedWith('zip stream error');
        });

        it('should be rejected if write stream emits an error', async function () {
          mockZipStream.pipe = (writeStream) => {
            writeStream.emit('error', new Error('write stream error'));
            mockZipStream.end();
            writeStream.end();
          };
          await zip._extractEntryTo(mockZipFile, entry).should.be.rejectedWith('write stream error');
        });
      });

      describe('toArchive', function () {
        it('should zip all files into an archive', async function () {
          const testFolder = path.resolve(assetsPath, 'unzipped');
          const dstPath = path.resolve(tmpRoot, 'test.zip');
          await zip.toArchive(dstPath, {
            cwd: testFolder,
          });

          // Unzip the file and test that it has the same contents as the directory that was zipped
          await zip.extractAllTo(dstPath, path.resolve(tmpRoot, 'output'));
          await fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'a.txt'), {
            encoding: 'utf8'
          }).should.eventually.equal('Hello World');
          await fs.readFile(path.resolve(tmpRoot, 'output', 'test-dir', 'b.txt'), {
            encoding: 'utf8'
          }).should.eventually.equal('Foo Bar');
        });
      });


    });
  });

  describe('unicode filename handling', function () {
    let zippedFilePath, assetsPath, tmpRoot;

    beforeEach(async function () {
      assetsPath = await tempDir.openDir();
      tmpRoot = await tempDir.openDir();

      const zippedBase64 = 'UEsDBBQACAAIABF8/EYAAAAAAAAAABoAAAATACAAa2Fuamkt5q2j5LiW5LiVLmFwcFVUDQAHAgO4VVpX+GBZV/hgdXgLAAEE9QEAAAQUAAAAK8nILFYAorz8EoWi1MScnEqFxDyFxIICLgBQSwcIR93jPhoAAAAaAAAAUEsBAhQDFAAIAAgAEXz8Rkfd4z4aAAAAGgAAABMAIAAAAAAAAAAAAKSBAAAAAGthbmppLeato+S4luS4lS5hcHBVVA0ABwIDuFVaV/hgWVf4YHV4CwABBPUBAAAEFAAAAFBLBQYAAAAAAQABAGEAAAB7AAAAAAA=';
      zippedFilePath = path.resolve(tmpRoot, 'zipped.zip');
      await fs.writeFile(zippedFilePath, zippedBase64, 'base64');
      await zip.extractAllTo(zippedFilePath, assetsPath, {useSystemUnzip: true});
    });

    afterEach(async function () {
      for (const tmpPath of [assetsPath, tmpRoot]) {
        if (!await fs.exists(tmpPath)) {
          continue;
        }
        await fs.rimraf(tmpPath);
      }
    });

    it('should retain the proper filenames', async function () {
      const expectedPath = path.join(assetsPath, 'kanji-正世丕.app');
      // we cannot use the `should` syntax because `fs.exists` resolves to a primitive (boolean)
      if (!await fs.exists(expectedPath)) {
        throw new chai.AssertionError(`Expected ${expectedPath} to exist, but it does not`);
      }
    });
  });
});
