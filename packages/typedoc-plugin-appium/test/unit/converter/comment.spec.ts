import {expect} from 'chai';
import {
  KnownMethods,
  BuiltinExternalDriverConverter,
  NAME_TYPES_MODULE,
  deriveComment,
} from '../../../lib/converter';
import {initConverter} from '../helpers';

describe('deriveComment()', function () {
  let knownMethods: KnownMethods;

  before(async function () {
    const converter = await initConverter(BuiltinExternalDriverConverter, NAME_TYPES_MODULE);
    knownMethods = converter.convert();
    expect(knownMethods.size).to.be.greaterThan(0);
    expect(knownMethods.get('activateApp')!.comment).to.exist;
  });

  describe('when not provided a reflection nor `Comment` parameter', function () {
    it('should derive the comment from KnownMethods', function () {
      const commentData = deriveComment('activateApp', knownMethods);
      expect(commentData).to.exist.and.to.have.keys('comment', 'commentSource');
    });
  });
});
