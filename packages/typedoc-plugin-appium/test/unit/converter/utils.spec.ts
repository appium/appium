import {createSandbox, SinonSandbox} from 'sinon';
import {
  DeclarationReflection,
  LiteralType,
  ReflectionKind,
  TupleType,
  TypeOperatorType,
} from 'typedoc';
import {
  convertCommandParams,
  MethodDefParamNamesDeclarationReflection,
  MethodDefParamsPropDeclarationReflection,
  NAME_OPTIONAL,
  NAME_PARAMS,
  NAME_REQUIRED,
  TupleTypeWithLiteralElements,
  TypeOperatorTypeWithTupleTypeWithLiteralElements,
} from '../../../lib/converter';

const {expect} = chai;

describe('utils', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('convertCommandParams()', function () {
    describe('when not provided a MethodDefParamsPropDeclarationReflection', function () {
      it('should return an empty array', function () {
        expect(convertCommandParams(NAME_REQUIRED)).to.be.empty.and.an('array');
      });
    });

    describe('when provided a MethodDefParamsPropDeclarationReflection', function () {
      let ref: MethodDefParamsPropDeclarationReflection;

      beforeEach(function () {
        // this is fudged since there's no `type` prop of type `ReflectionType`
        ref = new DeclarationReflection(
          NAME_PARAMS,
          ReflectionKind.Property
        ) as MethodDefParamsPropDeclarationReflection;
      });

      describe('when the reflection has no MethodDefParamNamesDeclarationReflection children', function () {
        it('should return an empty array', function () {
          expect(convertCommandParams(NAME_REQUIRED, ref)).to.be.empty.and.an('array');
        });
      });

      describe('when reflection has "required" MethodDefParamNamesDeclarationReflection children', function () {
        beforeEach(function () {
          const propNameRef = new DeclarationReflection(
            NAME_REQUIRED,
            ReflectionKind.Property,
            ref
          ) as MethodDefParamNamesDeclarationReflection;

          // it appears `type` must be assigned manually
          propNameRef.type = new TypeOperatorType(
            new TupleType([
              new LiteralType('foo'),
              new LiteralType('bar'),
              new LiteralType('baz'),
            ]) as TupleTypeWithLiteralElements,
            'readonly'
          ) as TypeOperatorTypeWithTupleTypeWithLiteralElements;

          ref.children = [propNameRef];
        });

        describe('when converting "required" props', function () {
          it('should return a list of prop names', function () {
            expect(convertCommandParams(NAME_REQUIRED, ref)).to.eql(['foo', 'bar', 'baz']);
          });
        });

        describe('when converting "optional" props', function () {
          it('should return an empty array', function () {
            expect(convertCommandParams(NAME_OPTIONAL, ref)).to.be.empty.and.an('array');
          });
        });
      });

      describe('when reflection has "optional" MethodDefParamNamesDeclarationReflection children', function () {
        beforeEach(function () {
          const propNameRef = new DeclarationReflection(
            NAME_OPTIONAL,
            ReflectionKind.Property,
            ref
          ) as MethodDefParamNamesDeclarationReflection;

          propNameRef.type = new TypeOperatorType(
            new TupleType([
              new LiteralType('foo'),
              new LiteralType('bar'),
              new LiteralType('baz'),
            ]) as TupleTypeWithLiteralElements,
            'readonly'
          ) as TypeOperatorTypeWithTupleTypeWithLiteralElements;

          ref.children = [propNameRef];
        });

        describe('when converting "optional" props', function () {
          it('should return a list of prop names', function () {
            expect(convertCommandParams(NAME_OPTIONAL, ref)).to.eql(['foo', 'bar', 'baz']);
          });
        });

        describe('when converting "required" props', function () {
          it('should return an empty array', function () {
            expect(convertCommandParams(NAME_REQUIRED, ref)).to.be.empty.and.an('array');
          });
        });
      });
    });
  });
});
