// @ts-check

import sinon from 'sinon';
import { rewiremock } from './helpers';

describe('grid-register', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('registerNode()', function () {
    let registerNode;
    let mocks;

    beforeEach(function () {
      mocks = {
        '@appium/support': {
          fs: {
            readFile: sandbox.stub().resolves('{}'),
          },
        },
        axios: sandbox.stub().resolves({data: '', status: 200}),
      };

      registerNode = rewiremock.proxy(
        () => require('../lib/grid-register'),
        mocks,
      ).default;
    });

    describe('when provided a path to a config file', function () {
      it('should read the config file', async function () {
        await registerNode('/path/to/config-file.json');
        mocks['@appium/support'].fs.readFile.should.have.been.calledOnceWith(
          '/path/to/config-file.json',
          'utf-8',
        );
      });

      it('should parse the config file as JSON', async function () {
        sandbox.spy(JSON, 'parse');
        await registerNode('/path/to/config-file.json');
        JSON.parse.should.have.been.calledOnceWith(
          await mocks['@appium/support'].fs.readFile.firstCall.returnValue,
        );
      });

      describe('when the config file is invalid', function () {
        beforeEach(function () {
          mocks['@appium/support'].fs.readFile.resolves('');
        });
        it('should reject', async function () {
          await registerNode('/path/to/config-file.json').should.be.rejected;
        });
      });
    });

    describe('when provided a config object', function () {
      it('should not attempt to read the object as a config file', async function () {
        await registerNode({my: 'config'});
        mocks['@appium/support'].fs.readFile.should.not.have.been.called;
      });

      it('should not attempt to parse any JSON', async function () {
        sandbox.spy(JSON, 'parse');
        await registerNode({my: 'config'});
        JSON.parse.should.not.have.been.called;
      });
    });
  });
});
