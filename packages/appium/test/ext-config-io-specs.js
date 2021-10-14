// @ts-check

import { promises as fs } from 'fs';
import path from 'path';
import sinon from 'sinon';
import YAML from 'yaml';
import { rewiremock } from './helpers';
const expect = chai.expect;

describe('ExtensionConfigIO', function () {
  /**
   * @type {import('sinon').SinonSandbox}
   */
  let sandbox;

  /** @type {string} */
  let yamlFixture;

  before(async function () {
    yamlFixture = await fs.readFile(
      path.join(__dirname, 'fixtures', 'extensions.yaml'),
      'utf8',
    );
  });

  /**
   * @type {typeof import('../lib/ext-config-io').getExtConfigIOInstance}
   */
  let getExtConfigIOInstance;

  let mocks;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    mocks = {
      '@appium/support': {
        fs: {
          readFile: sandbox.stub().resolves(yamlFixture),
          writeFile: sandbox.stub().resolves(true),
        },
        mkdirp: sandbox.stub().resolves(),
      },
    };
    getExtConfigIOInstance = rewiremock.proxy(
      '../lib/ext-config-io',
      mocks,
    ).getExtConfigIOInstance;
  });

  afterEach(function () {
    sandbox.restore();
    getExtConfigIOInstance.cache = new Map();
  });

  describe('instantiation', function () {
    describe('when called twice with the same `appiumHome` value', function () {
      it('should return the same object both times', function () {
        const firstInstance = getExtConfigIOInstance('/some/path');
        const secondInstance = getExtConfigIOInstance('/some/path');
        expect(firstInstance).to.equal(secondInstance);
      });
    });

    describe('when called twice with different `appiumHome` values', function () {
      it('should return different objects', function () {
        const firstInstance = getExtConfigIOInstance('/some/path');
        const secondInstance = getExtConfigIOInstance('/some/other/path');
        expect(firstInstance).to.not.equal(secondInstance);
      });
    });
  });

  describe('property', function () {
    describe('filepath', function () {
      it('should not be writable', function () {
        const instance = getExtConfigIOInstance('/some/path');
        expect(() => {
          // @ts-ignore
          instance.filepath = '/some/other/path';
        }).to.throw(TypeError);
      });
    });
  });

  describe('read()', function () {
    /** @type {import('../lib/ext-config-io').ExtensionConfigIO} */
    let io;

    beforeEach(function () {
      io = getExtConfigIOInstance('/some/path');
    });

    describe('when called with a valid extension type', function () {
      describe('when the file does not yet exist', function () {
        beforeEach(async function () {
          /** @type {NodeJS.ErrnoException} */
          const err = new Error();
          err.code = 'ENOENT';
          mocks['@appium/support'].fs.readFile.rejects(err);
          await io.read('driver');
        });

        it('should create a new file', function () {
          expect(mocks['@appium/support'].fs.writeFile).to.be.calledOnceWith(
            io.filepath,
            YAML.stringify({drivers: {}, plugins: {}, schemaRev: 2}),
            'utf8',
          );
        });
      });

      describe('when the file already exists', function () {
        beforeEach(async function () {
          await io.read('driver');
        });

        it('should attempt to create the `appiumHome` directory', function () {
          expect(mocks['@appium/support'].mkdirp).to.have.been.calledOnceWith(
            '/some/path',
          );
        });

        it('should attempt to read the file at `filepath`', function () {
          expect(
            mocks['@appium/support'].fs.readFile,
          ).to.have.been.calledOnceWith(io.filepath, 'utf8');
        });
      });
    });

    describe('when called with an unknown extension type`', function () {
      it('should reject', async function () {
        // @ts-ignore
        const promise = io.read('unknown');
        return await expect(promise).to.be.rejectedWith(
          TypeError,
          /invalid extension type/i,
        );
      });
    });

    describe('when called twice with the same `extensionType`', function () {
      it('should return the same object both times', async function () {
        const firstInstance = await io.read('driver');
        const secondInstance = await io.read('driver');
        expect(firstInstance).to.equal(secondInstance);
      });
    });
  });

  describe('write()', function () {
    let io;
    let driverData;

    beforeEach(function () {
      io = getExtConfigIOInstance('/some/path');
    });

    describe('when called after `read()`', function () {
      beforeEach(async function () {
        driverData = await io.read('driver');
      });

      describe('when called without modifying the data', function () {
        it('should not write the file', async function () {
          expect(await io.write()).to.be.false;
        });
      });

      describe('when called after adding a property', function () {
        beforeEach(function () {
          driverData.foo = {
            name: 'foo',
            version: '1.0.0',
            path: '/foo/path',
          };
        });

        it('should write the file', async function () {
          expect(await io.write()).to.be.true;
        });
      });

      describe('when called after deleting a property', function () {
        beforeEach(function () {
          driverData.foo = {
            name: 'foo',
            version: '1.0.0',
            path: '/foo/path',
          };
          io._dirty = false;
          delete driverData.foo;
        });

        it('should write the file', async function () {
          expect(await io.write()).to.be.true;
        });
      });

      describe('when the config file could not be written', function () {
        beforeEach(function () {
          mocks['@appium/support'].fs.writeFile = sandbox.stub().rejects(new Error());
          io._dirty = true;
        });

        it('should reject', async function () {
          await expect(io.write()).to.be.rejectedWith(Error, /Appium could not parse or write/i);
        });
      });

    });

    describe('when called before `read()`', function () {
      it('should return `false`', async function () {
        expect(await io.write()).to.be.false;
      });

      describe('when called with `force: true`', function () {
        it('should reject', async function () {
          await expect(io.write(true)).to.be.rejectedWith(ReferenceError, 'No data to write. Call `read()` first');
        });
      });
    });
  });
});
