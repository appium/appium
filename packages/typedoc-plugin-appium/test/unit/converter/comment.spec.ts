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
  CommentSourceType,
  deriveComment,
  KnownMethods,
} from '../../../lib/converter';
import {AppiumPluginReflectionKind, ExtensionReflection, ModuleCommands} from '../../../lib/model';

describe('@appium/typedoc-plugin-appium', function () {
  describe('deriveComment()', function () {
    let refl: CommandMethodDeclarationReflection;
    let project: ProjectReflection;

    beforeEach(function () {
      project = new ProjectReflection('my project');
      refl = new DeclarationReflection(
        'test',
        AppiumPluginReflectionKind.Command as any,
        new ExtensionReflection('somedriver', project, new ModuleCommands())
      ) as CommandMethodDeclarationReflection;
    });

    describe('when not provided parameters', function () {
      it('should return undefined', function () {
        const commentData = deriveComment();
        expect(commentData).to.be.undefined;
      });
    });

    describe('when provided a CommandMethodDeclarationReflection with Comment with its own summary text', function () {
      beforeEach(function () {
        refl.comment = new Comment([{kind: 'text', text: 'a summary'}]);
      });

      it('should return CommentData referencing the comment', function () {
        const commentData = deriveComment({refl});
        expect(commentData).to.eql({
          commentSource: CommentSourceType.Method,
          comment: refl.comment,
        });
      });
    });

    describe('when provided a CommandMethodDeclarationReflection with a Comment with its own block tags', function () {
      beforeEach(function () {
        refl.comment = new Comment(undefined, [
          new CommentTag('@privateRemarks', [{kind: 'text', text: 'secret remarks'}]),
        ]);
      });

      it('should return CommentData referencing the comment', function () {
        const commentData = deriveComment({refl});
        expect(commentData).to.eql({
          commentSource: CommentSourceType.Method,
          comment: refl.comment,
        });
      });
    });

    describe('when provided a CommandMethodDeclarationReflection with a Comment with its own summary text and its own block tags', function () {
      beforeEach(function () {
        refl.comment = new Comment(
          [{kind: 'text', text: 'a summary'}],
          [new CommentTag('@privateRemarks', [{kind: 'text', text: 'a funny comment'}])]
        );
      });

      it('should return CommentData referencing the comment', function () {
        const commentData = deriveComment({refl});
        expect(commentData).to.eql({
          commentSource: CommentSourceType.Method,
          comment: refl.comment,
        });
      });
    });

    describe('when provided a CommandMethodDeclarationReflection its own summary and block tags from another source', function () {
      let knownMethods: KnownMethods;
      let otherRefl: CommandMethodDeclarationReflection;
      let otherBlockTags: CommentTag[];
      beforeEach(function () {
        refl.comment = new Comment([{kind: 'text', text: 'a funny comment'}]);
        otherBlockTags = [new CommentTag('@example', [{kind: 'code', text: 'doStuff();'}])];
        otherBlockTags[0].name = undefined;
        otherRefl = new DeclarationReflection(
          refl.name,
          AppiumPluginReflectionKind.Command as any
        ) as CommandMethodDeclarationReflection;
        otherRefl.comment = new Comment(undefined, otherBlockTags);
        knownMethods = new Map([[refl.name, otherRefl]]);
      });

      it('should return a CommentData containing an abomination of info from multiple sources', function () {
        const commentData = deriveComment({refl, knownMethods});
        expect(commentData).to.eql({
          commentSource: CommentSourceType.Multiple,
          comment: {...refl.comment, blockTags: otherBlockTags},
        });
      });
    });

    describe('when provided a CommandMethodDeclarationReflection its own summary and block tag and the same block tag from another source', function () {
      let knownMethods: KnownMethods;
      let otherRefl: CommandMethodDeclarationReflection;
      let otherBlockTags: CommentTag[];
      let blockTags: CommentTag[];
      beforeEach(function () {
        blockTags = [new CommentTag('@example', [{kind: 'code', text: 'doThisInstead();'}])];
        refl.comment = new Comment([{kind: 'text', text: 'a funny comment'}], blockTags);
        otherBlockTags = [new CommentTag('@example', [{kind: 'code', text: 'doStuff();'}])];
        otherRefl = new DeclarationReflection(
          refl.name,
          AppiumPluginReflectionKind.Command as any
        ) as CommandMethodDeclarationReflection;
        otherRefl.comment = new Comment(undefined, otherBlockTags);
        knownMethods = new Map([[refl.name, otherRefl]]);
      });

      it('should return a CommentData containing only the block tags from the CommandMethodDeclarationReflection', function () {
        const {comment, commentSource} = deriveComment({refl, knownMethods})!;
        expect(comment).to.equal(refl.comment);
        expect(commentSource).to.equal(CommentSourceType.Method);
      });
    });

    describe('when called with a parameter', function () {
      describe('when provided a CommandMethodDeclarationReflection having a parameter with a visible comment', function () {
        let param: ParameterReflection;
        let paramComment: Comment;

        beforeEach(function () {
          const sig = new SignatureReflection(
            'test',
            ReflectionKind.CallSignature,
            refl
          ) as AsyncCallSignatureReflection;
          param = new ParameterReflection('foo', ReflectionKind.Parameter, sig);
          paramComment = new Comment([{kind: 'text', text: 'a description of the parameter'}]);
          param.comment = paramComment;
          expect(param.hasComment()).to.be.true;
          sig.parameters = [param];
          refl.signatures = [sig];
        });

        it('should find the comment in the parameter', function () {
          expect(deriveComment({refl: param})).to.eql({
            comment: paramComment,
            commentSource: CommentSourceType.Parameter,
          });
        });
      });

      describe('when provided a ommandMethodDeclarationReflection having a parameter without a comment, and an associated builtin method with the same parameter having a comment', function () {
        let param: ParameterReflection;
        let knownMethods: KnownMethods;
        let otherParamComment: Comment;

        beforeEach(function () {
          const sig = new SignatureReflection(
            'test',
            ReflectionKind.CallSignature,
            refl
          ) as AsyncCallSignatureReflection;
          param = new ParameterReflection('foo', ReflectionKind.Parameter, sig);
          expect(param.hasComment()).to.be.false;
          sig.parameters = [param];
          refl.signatures = [sig];
          const otherRefl = new DeclarationReflection(
            refl.name,
            AppiumPluginReflectionKind.Command as any
          ) as CommandMethodDeclarationReflection;
          otherRefl.type = ReferenceType.createBrokenReference('stuff', project);
          const otherSig = new SignatureReflection(
            'test',
            ReflectionKind.CallSignature,
            otherRefl
          ) as AsyncCallSignatureReflection;
          const otherParam = new ParameterReflection('foo', ReflectionKind.Parameter, otherSig);
          otherParamComment = new Comment([{kind: 'text', text: 'a description of the parameter'}]);
          otherParam.comment = otherParamComment;
          expect(otherParam.hasComment()).to.be.true;
          otherSig.parameters = [otherParam];
          otherRefl.signatures = [otherSig];
          knownMethods = new Map([[refl.name, otherRefl]]);
        });

        it('should use the comment from the builtin method', function () {
          const {comment, commentSource} = deriveComment({refl: param, knownMethods})!;
          expect(comment).to.eql(otherParamComment);
          expect(commentSource).to.equal(CommentSourceType.BuiltinParameter);
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
