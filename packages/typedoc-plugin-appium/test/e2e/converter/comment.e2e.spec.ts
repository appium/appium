import {expect} from 'chai';
import {
  KnownMethods,
  BuiltinExternalDriverConverter,
  NAME_TYPES_MODULE,
  deriveComment,
} from '../../../lib/converter';
import {initConverter} from '../helpers';

describe('@appium/typedoc-plugin-appium', function () {
  describe('comments', function () {
    let knownMethods: KnownMethods;

    before(async function () {
      const converter = await initConverter(BuiltinExternalDriverConverter, NAME_TYPES_MODULE);
      knownMethods = converter.convert();
      expect(knownMethods.size).to.be.greaterThan(0);
      expect(knownMethods.get('activateApp')).to.exist;
    });

    it('should', function () {});
  });
});
