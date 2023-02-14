import {expect} from 'chai';
import {
  Comment,
  CommentTag,
  DeclarationReflection,
  ParameterReflection,
  ProjectReflection,
  ReferenceType,
  ReflectionKind,
  SignatureReflection,
} from 'typedoc';
import {
  AsyncCallSignatureReflection,
  cloneComment,
  CommandMethodDeclarationReflection,
  CommentSource,
  deriveComment,
  KnownMethods,
} from '../../../lib/converter';
import {AppiumPluginReflectionKind, ExtensionReflection, ModuleCommands} from '../../../lib/model';

describe('@appium/typedoc-plugin-appium', function () {
  describe('deriveComment()', function () {
    let project: ProjectReflection;
    let knownMethods: KnownMethods;
    let methodRefl: CommandMethodDeclarationReflection;

    describe('when not provided parameters', function () {
      it('should return undefined', function () {
        const commentData = deriveComment();
        expect(commentData).to.be.undefined;
      });
    });

    describe('when provided a CommandMethodDeclarationReflection', function () {
      beforeEach(function () {
        project = new ProjectReflection('my project');
        methodRefl = new DeclarationReflection(
          'test',
          ReflectionKind.Method,
          new ExtensionReflection('somedriver', project, new ModuleCommands())
        ) as CommandMethodDeclarationReflection;
      });

      describe('when reflection has Comment with its own summary text', function () {
        beforeEach(function () {
          methodRefl.comment = new Comment([{kind: 'text', text: 'a summary'}]);
        });

        it('should return CommentData referencing the comment', function () {
          const commentData = deriveComment({refl: methodRefl});
          expect(commentData).to.eql({
            commentSource: CommentSource.Method,
            comment: methodRefl.comment,
          });
        });
      });

      describe('when provided a reflection with a Comment with its own block tags', function () {
        beforeEach(function () {
          methodRefl.comment = new Comment(undefined, [
            new CommentTag('@privateRemarks', [{kind: 'text', text: 'secret remarks'}]),
          ]);
        });

        it('should return CommentData referencing the comment', function () {
          methodRefl; //?
          const commentData = deriveComment({refl: methodRefl});
          expect(commentData).to.eql({
            commentSource: CommentSource.Method,
            comment: methodRefl.comment,
          });
        });
      });

      describe('when provided a reflection with a Comment with its own summary text and its own block tags', function () {
        beforeEach(function () {
          methodRefl.comment = new Comment(
            [{kind: 'text', text: 'a summary'}],
            [new CommentTag('@privateRemarks', [{kind: 'text', text: 'a funny comment'}])]
          );
        });

        it('should return CommentData referencing the comment', function () {
          const commentData = deriveComment({refl: methodRefl});
          expect(commentData).to.eql({
            commentSource: CommentSource.Method,
            comment: methodRefl.comment,
          });
        });
      });

      describe('when provided a reflection with its own summary and block tags from another source', function () {
        let otherRefl: CommandMethodDeclarationReflection;
        let otherBlockTags: CommentTag[];

        beforeEach(function () {
          methodRefl.comment = new Comment([{kind: 'text', text: 'a funny comment'}]);
          otherBlockTags = [new CommentTag('@example', [{kind: 'code', text: 'doStuff();'}])];
          otherBlockTags[0].name = undefined;
          otherRefl = new DeclarationReflection(
            methodRefl.name,
            AppiumPluginReflectionKind.Command as any
          ) as CommandMethodDeclarationReflection;
          otherRefl.comment = new Comment(undefined, otherBlockTags);
          knownMethods = new Map([[methodRefl.name, otherRefl]]);
        });

        it('should return a CommentData containing an abomination of info from multiple sources', function () {
          const commentData = deriveComment({refl: methodRefl, knownMethods});
          expect(commentData).to.eql({
            commentSource: CommentSource.Multiple,
            comment: {...methodRefl.comment, blockTags: otherBlockTags},
          });
        });
      });

      describe('when provided a reflection with its own summary and block tag and the same block tag from another source', function () {
        let knownMethods: KnownMethods;
        let otherRefl: CommandMethodDeclarationReflection;
        let otherBlockTags: CommentTag[];
        let blockTags: CommentTag[];
        beforeEach(function () {
          blockTags = [new CommentTag('@example', [{kind: 'code', text: 'doThisInstead();'}])];
          methodRefl.comment = new Comment([{kind: 'text', text: 'a funny comment'}], blockTags);
          otherBlockTags = [new CommentTag('@example', [{kind: 'code', text: 'doStuff();'}])];
          otherRefl = new DeclarationReflection(
            methodRefl.name,
            AppiumPluginReflectionKind.Command as any
          ) as CommandMethodDeclarationReflection;
          otherRefl.comment = new Comment(undefined, otherBlockTags);
          knownMethods = new Map([[methodRefl.name, otherRefl]]);
        });

        it('should return a CommentData containing only the block tags from the CommandMethodDeclarationReflection', function () {
          const {comment, commentSource} = deriveComment({refl: methodRefl, knownMethods})!;
          expect(comment).to.equal(methodRefl.comment);
          expect(commentSource).to.equal(CommentSource.Method);
        });
      });
    });

    describe('when provided a ParameterReflection', function () {
      let refl: CommandMethodDeclarationReflection;
      let paramRefl: ParameterReflection;
      let paramComment: Comment;

      describe('when provided a reflection having a visible comment', function () {
        beforeEach(function () {
          refl = new DeclarationReflection(
            'test',
            ReflectionKind.Method,
            new ExtensionReflection('somedriver', project, new ModuleCommands())
          ) as CommandMethodDeclarationReflection;

          // for deriveComment to work for ParameterReflections, the reflection
          // must have a parent SignatureReflection, and that SignatureReflection
          // must have a parent (CommandMethod)DeclarationReflection
          const sig = new SignatureReflection(
            'test',
            ReflectionKind.CallSignature,
            refl
          ) as AsyncCallSignatureReflection;
          paramRefl = new ParameterReflection('foo', ReflectionKind.Parameter, sig);
          paramComment = new Comment([{kind: 'text', text: 'a description of the parameter'}]);
          paramRefl.comment = paramComment;
          expect(paramRefl.hasComment()).to.be.true;
          sig.parameters = [paramRefl];
          refl.signatures = [sig];
        });

        it('should find the comment in the parameter', function () {
          expect(deriveComment({refl: paramRefl})).to.eql({
            comment: paramComment,
            commentSource: CommentSource.Parameter,
          });
        });
      });

      describe('when provided a reflection without a visible comment, and an associated reflection of a builtin method having a comment', function () {
        let knownMethods: KnownMethods;
        let otherParamComment: Comment;

        beforeEach(function () {
          const sigRefl = new SignatureReflection(
            'test',
            ReflectionKind.CallSignature,
            refl
          ) as AsyncCallSignatureReflection;
          paramRefl = new ParameterReflection('foo', ReflectionKind.Parameter, sigRefl);
          expect(paramRefl.hasComment()).to.be.false;
          sigRefl.parameters = [paramRefl];
          refl.signatures = [sigRefl];
          const otherRefl = new DeclarationReflection(
            refl.name,
            AppiumPluginReflectionKind.Command as any
          ) as CommandMethodDeclarationReflection;
          otherRefl.type = ReferenceType.createBrokenReference('stuff', project);
          const otherSigRefl = new SignatureReflection(
            'test',
            ReflectionKind.CallSignature,
            otherRefl
          ) as AsyncCallSignatureReflection;
          const otherParam = new ParameterReflection('foo', ReflectionKind.Parameter, otherSigRefl);
          otherParamComment = new Comment([{kind: 'text', text: 'a description of the parameter'}]);
          otherParam.comment = otherParamComment;
          expect(otherParam.hasComment()).to.be.true;
          otherSigRefl.parameters = [otherParam];
          otherRefl.signatures = [otherSigRefl];
          knownMethods = new Map([[refl.name, otherRefl]]);
        });

        it('should use the comment from the builtin method', function () {
          const {comment, commentSource} = deriveComment({refl: paramRefl, knownMethods})!;
          expect(comment).to.eql(otherParamComment);
          expect(commentSource).to.equal(CommentSource.BuiltinParameter);
        });
      });
    });

    describe('when provided a SignatureReflection', function () {
      let sigRefl: SignatureReflection;

      beforeEach(function () {
        sigRefl = new SignatureReflection(
          'test',
          ReflectionKind.CallSignature,
          methodRefl
        ) as AsyncCallSignatureReflection;
      });

      describe('when provided a reflection having a visible comment', function () {
        beforeEach(function () {
          sigRefl.comment = new Comment([{kind: 'text', text: 'a description of the method'}]);
          expect(sigRefl.hasComment()).to.be.true;
        });

        it('should find the comment in the signature', function () {
          expect(deriveComment({refl: sigRefl})).to.eql({
            comment: sigRefl.comment,
            commentSource: CommentSource.Signature,
          });
        });
      });

      describe('when provided a reflection with an explicit comment', function () {
        let comment: Comment;

        beforeEach(function () {
          comment = new Comment([{kind: 'text', text: 'a description of the method'}]);
        });

        it('should return the explicit comment', function () {
          expect(deriveComment({refl: sigRefl, comment})).to.eql({
            comment,
            commentSource: CommentSource.OtherComment,
          });
        });
      });

      describe('when provided a reflection without a comment and an associated method having a signature with a visible comment', function () {
        let otherSig: AsyncCallSignatureReflection;
        beforeEach(function () {
          const otherRefl = new DeclarationReflection(
            methodRefl.name,
            ReflectionKind.Method
          ) as CommandMethodDeclarationReflection;
          otherSig = new SignatureReflection(
            'test',
            ReflectionKind.CallSignature,
            otherRefl
          ) as AsyncCallSignatureReflection;
          otherSig.comment = new Comment([{kind: 'text', text: 'a description of the method'}]);
          otherRefl.signatures = [otherSig];
          knownMethods = new Map([[methodRefl.name, otherRefl]]);
        });
        it('should find the comment', function () {
          expect(deriveComment({refl: sigRefl, knownMethods})).to.eql({
            comment: otherSig.comment,
            commentSource: CommentSource.BuiltinSignature,
          });
        });
      });

      describe('when provided a reflection without a comment and no associated method exists', function () {
        beforeEach(function () {
          knownMethods = new Map();
        });

        it('should return undefined', function () {
          expect(deriveComment({refl: sigRefl, knownMethods})).to.be.undefined;
        });
      });

      describe('when provided a reflection without a comment, and an associated method exists having no signature', function () {
        beforeEach(function () {
          const otherRefl = new DeclarationReflection(
            methodRefl.name,
            ReflectionKind.Method
          ) as CommandMethodDeclarationReflection;
          knownMethods = new Map([[methodRefl.name, otherRefl]]);
        });

        it('should return undefined', function () {
          expect(deriveComment({refl: sigRefl, knownMethods})).to.be.undefined;
        });
      });
    });
  });

  describe('cloneComment()', function () {
    /**
     * Asserts that `b` has all properties of `a` (recursively) and that each object in `a` is an
     * in `b`, and each primitive is strictly equal in both places.
     * @param a some thing
     * @param b another thing
     */
    function assertDeepEqual(a: any, b: any): void {
      for (const [key, value] of Object.entries(a)) {
        if (typeof value === 'object') {
          expect(typeof b[key]).to.equal('object');
          return assertDeepEqual(value, b[key]);
        } else {
          expect(value).to.equal(b[key]);
        }
      }
    }
    describe('when not provided any blockTags', function () {
      it('should clone a Comment', function () {
        const comment = new Comment(
          [{kind: 'text', text: 'a funny comment'}],
          [new CommentTag('@example', [{kind: 'code', text: 'doStuff();'}])]
        );
        const cloned = cloneComment(comment);
        expect(assertDeepEqual(comment, cloned)).not.to.throw;
      });
    });
  });
});
