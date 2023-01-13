import {expect} from 'chai';
import {createSandbox, SinonSandbox} from 'sinon';
import {Context} from 'typedoc';
import {
  BuiltinExternalDriverConverter,
  KnownMethods,
  NAME_EXTERNAL_DRIVER,
  NAME_TYPES_MODULE,
} from '../../../lib/converter';
import {AppiumPluginLogger} from '../../../lib/logger';
import {initConverter, NAME_FAKE_DRIVER_MODULE} from '../helpers';

describe('BuiltinExternalDriverConverter', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    it('should instantiate a BuiltinExternalDriverConverter', function () {
      const ctx = sandbox.createStubInstance(Context);
      const log = sandbox.createStubInstance(AppiumPluginLogger);
      expect(new BuiltinExternalDriverConverter(ctx, log)).to.be.an.instanceof(
        BuiltinExternalDriverConverter
      );
    });
  });

  describe('instance method', function () {
    describe('convert()', function () {
      let converter: BuiltinExternalDriverConverter;
      let knownMethods: KnownMethods;

      before(async function () {
        converter = await initConverter(BuiltinExternalDriverConverter, NAME_TYPES_MODULE);
        knownMethods = converter.convert();
      });

      it(`should find ${NAME_EXTERNAL_DRIVER}'s method declarations in ${NAME_TYPES_MODULE}`, async function () {
        expect(knownMethods.size).to.be.above(0);
      });

      it(`should only work with ${NAME_TYPES_MODULE}`, async function () {
        const badConverter = await initConverter(
          BuiltinExternalDriverConverter,
          NAME_FAKE_DRIVER_MODULE
        );
        expect(badConverter.convert()).to.be.empty;
      });

      it(`should contain methods in ${NAME_EXTERNAL_DRIVER}`, async function () {
        converter = await initConverter(BuiltinExternalDriverConverter, NAME_TYPES_MODULE);
        knownMethods = converter.convert();
        expect(knownMethods.size).to.be.above(0);
        let {method, comment} = knownMethods.get('createSession')!;
        expect(method).to.exist;
        expect(comment).to.exist;
        ({method, comment} = knownMethods.get('activateApp')!);
        expect(method).to.exist;
        expect(comment).to.exist;
      });
    });
  });
});
