// @ts-check

import path from 'path';
import rewiremock from 'rewiremock/node';
import sinon from 'sinon';

const expect = chai.expect;

describe('ExtensionConfig', function () {
  describe('getGenericConfigProblems()', function () {
    it('should have some tests');
  });

  describe('DriverConfig', function () {
    /**
     * @type {typeof import('../lib/driver-config').default}
     */
    let DriverConfig;
    let mocks;
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;
    beforeEach(function () {
      mocks = {
        'resolve-from': sinon.stub().callsFake((cwd, id) => path.join(cwd, id)),
      };

      DriverConfig = rewiremock.proxy(
        () => require('../lib/driver-config'),
        mocks,
      ).default;

      sandbox = sinon.createSandbox();
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('extensionDesc()', function () {
      it('should return the description of the extension', function () {
        const config = DriverConfig.getInstance('/tmp/');
        config
          .extensionDesc('foo', {version: '1.0', automationName: 'bar'})
          .should.equal(`foo@1.0 (automationName 'bar')`);
      });
    });

    describe('getConfigProblems()', function () {
      /**
       * @type {ReturnType<DriverConfig['getInstance']>}
       */
      let driverConfig;

      beforeEach(function () {
        driverConfig = DriverConfig.getInstance('/tmp/');
      });

      describe('when provided no arguments', function () {
        it('should throw', function () {
          // @ts-ignore
          (() => driverConfig.getConfigProblems()).should.throw();
        });
      });

      describe('property `platformNames`', function () {
        describe('when provided an object with no `platformNames` property', function () {
          it('should return an array with an associated problem', function () {
            driverConfig.getConfigProblems({}, 'foo').should.deep.include({
              err: 'Missing or incorrect supported platformNames list.',
              val: undefined,
            });
          });
        });

        describe('when provided an object with an empty `platformNames` property', function () {
          it('should return an array with an associated problem', function () {
            driverConfig
              .getConfigProblems({platformNames: []}, 'foo')
              .should.deep.include({
                err: 'Empty platformNames list.',
                val: [],
              });
          });
        });

        describe('when provided an object with a non-array `platformNames` property', function () {
          it('should return an array with an associated problem', function () {
            driverConfig
              .getConfigProblems({platformNames: 'foo'}, 'foo')
              .should.deep.include({
                err: 'Missing or incorrect supported platformNames list.',
                val: 'foo',
              });
          });
        });

        describe('when provided a non-empty array containing a non-string item', function () {
          it('should return an array with an associated problem', function () {
            driverConfig
              .getConfigProblems({platformNames: ['a', 1]}, 'foo')
              .should.deep.include({
                err: 'Incorrectly formatted platformName.',
                val: 1,
              });
          });
        });
      });

      describe('property `automationName`', function () {
        describe('when provided an object with a missing `automationName` property', function () {
          it('should return an array with an associated problem', function () {
            driverConfig.getConfigProblems({}, 'foo').should.deep.include({
              err: 'Missing or incorrect automationName',
              val: undefined,
            });
          });
        });
        describe('when provided a conflicting automationName', function () {
          it('should return an array with an associated problem', function () {
            driverConfig.getConfigProblems({automationName: 'foo'}, 'foo');
            driverConfig
              .getConfigProblems({automationName: 'foo'}, 'foo')
              .should.deep.include({
                err: 'Multiple drivers claim support for the same automationName',
                val: 'foo',
              });
          });
        });
      });
    });

    describe('getSchemaProblems()', function () {
      /**
       * @type {ReturnType<DriverConfig['getInstance']>}
       */
      let driverConfig;

      beforeEach(function () {
        driverConfig = DriverConfig.getInstance('/tmp/');
      });
      describe('when provided an object with a defined non-string `schema` property', function () {
        it('should return an array with an associated problem', function () {
          driverConfig
            .getSchemaProblems({schema: []}, 'foo')
            .should.deep.include({
              err: 'Incorrectly formatted schema field; must be a path to a schema file.',
              val: [],
            });
        });
      });

      describe('when provided a string `schema` property', function () {
        describe('when the property ends in an unsupported extension', function () {
          it('should return an array with an associated problem', function () {
            driverConfig
              .getSchemaProblems({schema: 'selenium.java'}, 'foo')
              .should.deep.include({
                err: 'Schema file has unsupported extension. Allowed: .json, .js, .cjs',
                val: 'selenium.java',
              });
          });
        });

        describe('when the property contains a supported extension', function () {
          describe('when the property as a path cannot be found', function () {
            it('should return an array with an associated problem', function () {
              const problems = driverConfig.getSchemaProblems(
                {
                  installPath: '/usr/bin/derp',
                  pkgName: 'doop',
                  schema: 'herp.json',
                },
                'foo',
              );
              problems[0].err.should.match(/Unable to register schema at path herp\.json/i);
              // problems.should.deep.include({
              //   err: `Unable to register schema at path herp.json`,
              //   val: 'herp.json',
              // });
            });
          });

          describe('when the property as a path is found', function () {
            it('should return an empty array', function () {
              const problems = driverConfig.getSchemaProblems(
                {
                  pkgName: 'fixtures', // just corresponds to a directory name relative to `installPath` `(__dirname)`
                  installPath: __dirname,
                  schema: 'driver.schema.js',
                },
                'foo',
              );
              problems.should.be.empty;
            });
          });
        });
      });
    });

    describe('read()', function () {
      /**
       * @type {ReturnType<DriverConfig['getInstance']>}
       */
      let driverConfig;

      beforeEach(function () {
        driverConfig = DriverConfig.getInstance('/tmp/');
        sandbox.spy(driverConfig, 'validate');
      });

      it('should validate the extension', async function () {
        await driverConfig.read();
        driverConfig.validate.should.have.been.calledOnce;
      });
    });

    describe('readExtensionSchema()', function () {
      /**
       * @type {ReturnType<DriverConfig['getInstance']>}
       */
      let driverConfig;

      /** @type {import('../lib/extension-config').ExtData} */
      let extData;

      const extName = 'stuff';

      beforeEach(function () {
        extData = {
          installPath: 'fixtures',
          pkgName: 'some-pkg',
          schema: 'driver.schema.js',
        };
        mocks['resolve-from'].returns(
          require.resolve('./fixtures/driver.schema.js'),
        );
        driverConfig = DriverConfig.getInstance('/tmp/');
      });

      describe('when the extension data is missing `schema`', function () {
        it('should throw', function () {
          delete extData.schema;
          expect(() =>
            driverConfig.readExtensionSchema(extName, extData),
          ).to.throw(TypeError, /why is this function being called/i);
        });
      });

      describe('when the extension schema has already been registered (with the same schema)', function () {
        it('should not throw', function () {
          driverConfig.readExtensionSchema(extName, extData);
          expect(() => driverConfig.readExtensionSchema(extName, extData)).not.to.throw();
        });
      });

      describe('when the extension schema has not yet been registered', function () {
        it('should resolve and load the extension schema file', function () {
          driverConfig.readExtensionSchema (extName, extData);

          // we don't have access to the schema registration cache directly, so this is as close as we can get.
          expect(mocks['resolve-from']).to.have.been.calledOnce;
        });
      });
    });
  });

  describe('PluginConfig', function () {
    /**
     * @type {typeof import('../lib/plugin-config').default}
     */
    let PluginConfig;
    let mocks;
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;
    beforeEach(function () {
      mocks = {
        'resolve-from': sinon.stub().callsFake((cwd, id) => path.join(cwd, id)),
      };

      PluginConfig = rewiremock.proxy(
        () => require('../lib/plugin-config'),
        mocks,
      ).default;

      sandbox = sinon.createSandbox();
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('extensionDesc()', function () {
      it('should return the description of the extension', function () {
        const config = PluginConfig.getInstance('/tmp/');
        config
          .extensionDesc('foo', {version: '1.0'})
          .should.equal(`foo@1.0`);
      });
    });

    describe('getConfigProblems()', function () {
      /**
       * @type {ReturnType<PluginConfig['getInstance']>}
       */
      let pluginConfig;

      beforeEach(function () {
        pluginConfig = PluginConfig.getInstance('/tmp/');
      });

      describe('when provided no arguments', function () {
        it('should not throw', function () {
          // @ts-ignore
          (() => pluginConfig.getConfigProblems()).should.not.throw();
        });
      });
    });

    describe('getSchemaProblems()', function () {
      /**
       * @type {ReturnType<PluginConfig['getInstance']>}
       */
      let pluginConfig;

      beforeEach(function () {
        pluginConfig = PluginConfig.getInstance('/tmp/');
      });
      describe('when provided an object with a defined non-string `schema` property', function () {
        it('should return an array with an associated problem', function () {
          pluginConfig
            .getSchemaProblems({schema: []}, 'foo')
            .should.deep.include({
              err: 'Incorrectly formatted schema field; must be a path to a schema file.',
              val: [],
            });
        });
      });

      describe('when provided a string `schema` property', function () {
        describe('when the property ends in an unsupported extension', function () {
          it('should return an array with an associated problem', function () {
            pluginConfig
              .getSchemaProblems({schema: 'selenium.java'}, 'foo')
              .should.deep.include({
                err: 'Schema file has unsupported extension. Allowed: .json, .js, .cjs',
                val: 'selenium.java',
              });
          });
        });

        describe('when the property contains a supported extension', function () {
          describe('when the property as a path cannot be found', function () {
            it('should return an array with an associated problem', function () {
              const problems = pluginConfig.getSchemaProblems(
                {
                  installPath: '/usr/bin/derp',
                  pkgName: 'doop',
                  schema: 'herp.json',
                },
                'foo',
              );
              problems[0].err.should.match(/Unable to register schema at path herp\.json/i);
            });
          });

          describe('when the property as a path is found', function () {
            it('should return an empty array', function () {
              const problems = pluginConfig.getSchemaProblems(
                {
                  pkgName: 'fixtures', // just corresponds to a directory name relative to `installPath` `(__dirname)`
                  installPath: __dirname,
                  schema: 'plugin.schema.js',
                },
                'foo',
              );
              problems.should.be.empty;
            });
          });
        });
      });
    });

    describe('read()', function () {
      /**
       * @type {ReturnType<PluginConfig['getInstance']>}
       */
      let pluginConfig;

      beforeEach(function () {
        pluginConfig = PluginConfig.getInstance('/tmp/');
        sandbox.spy(pluginConfig, 'validate');
      });

      it('should validate the extension', async function () {
        await pluginConfig.read();
        pluginConfig.validate.should.have.been.calledOnce;
      });
    });

    describe('readExtensionSchema()', function () {
      /**
       * @type {ReturnType<PluginConfig['getInstance']>}
       */
      let pluginConfig;

      /** @type {import('../lib/extension-config').ExtData} */
      let extData;

      const extName = 'stuff';

      beforeEach(function () {
        extData = {
          installPath: 'fixtures',
          pkgName: 'some-pkg',
          schema: 'plugin.schema.js',
        };
        mocks['resolve-from'].returns(
          require.resolve('./fixtures/plugin.schema.js'),
        );
        pluginConfig = PluginConfig.getInstance('/tmp/');

      });

      describe('when the extension data is missing `schema`', function () {
        it('should throw', function () {
          delete extData.schema;
          expect(() =>
            pluginConfig.readExtensionSchema(extName, extData),
          ).to.throw(TypeError, /why is this function being called/i);
        });
      });

      describe('when the extension schema has already been registered', function () {
        describe('when the schema is identical (presumably the same extension)', function () {
          it('should not throw', function () {
            pluginConfig.readExtensionSchema(extName, extData);
            expect(() => pluginConfig.readExtensionSchema(extName, extData)).not.to.throw();
          });
        });

        describe('when the schema differs (presumably a different extension)', function () {
          it('should throw', function () {
            pluginConfig.readExtensionSchema(extName, extData);
            mocks['resolve-from'].returns(require.resolve('./fixtures/driver.schema.js'));
            expect(() => pluginConfig.readExtensionSchema(extName, extData)).to.throw(/conflicts with an existing schema/i);
          });
        });
      });

      describe('when the extension schema has not yet been registered', function () {
        it('should resolve and load the extension schema file', function () {
          pluginConfig.readExtensionSchema (extName, extData);

          // we don't have access to the schema registration cache directly, so this is as close as we can get.
          expect(mocks['resolve-from']).to.have.been.calledOnce;
        });
      });
    });
  });
});
