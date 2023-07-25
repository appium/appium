import path from 'node:path';
import {tempDir, fs} from 'appium/support';
import {jestSnapshotPlugin} from 'mocha-chai-jest-snapshot';
import {reset} from '../helpers';
import {convert} from '../../../lib';

chai.use(jestSnapshotPlugin());

const {expect} = chai;

describe('@appium/typedoc-plugin-appium', function () {
  let tmpDir: string;
  before(async function () {
    const app = await reset();
    const convertPromise = convert(app);
    const project = app.convert();
    await convertPromise;
    tmpDir = await tempDir.openDir();
    await app.generateDocs(project!, tmpDir);
  });

  after(async function () {
    await fs.rimraf(tmpDir);
  });

  describe('theme', function () {
    describe('command output', function () {
      it('should generate expected markdown', async function () {
        const baseDriverMd = await fs.readFile(
          path.join(tmpDir, 'commands', 'base-driver.md'),
          'utf8'
        );
        expect(baseDriverMd).toMatchSnapshot();
      });
    });
    describe('execute method output', function () {
      it('should generate expected markdown', async function () {
        const fakeDriverMd = await fs.readFile(
          path.join(tmpDir, 'commands', 'fake-driver.md'),
          'utf8'
        );
        expect(fakeDriverMd).toMatchSnapshot();
      });
    });
  });
});
