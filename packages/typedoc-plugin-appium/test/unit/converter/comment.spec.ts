import {expect} from 'chai';
import {
  Comment,
  CommentTag,
  DeclarationReflection,
  ProjectReflection,
  ReferenceType,
} from 'typedoc';
import {
  KnownMethods,
  deriveComment,
  CommandMethodDeclarationReflection,
  CommentSourceType,
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
        otherRefl = new DeclarationReflection(
          refl.name,
          AppiumPluginReflectionKind.Command as any
        ) as CommandMethodDeclarationReflection;
        otherRefl.type = ReferenceType.createBrokenReference('stuff', project);
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
        otherRefl.type = ReferenceType.createBrokenReference('stuff', project);
        otherRefl.comment = new Comment(undefined, otherBlockTags);
        knownMethods = new Map([[refl.name, otherRefl]]);
      });

      it('should return a CommentData containing only the block tags from the CommandMethodDeclarationReflection', function () {
        const {comment, commentSource} = deriveComment({refl, knownMethods})!;
        expect(comment).to.equal(refl.comment);
        expect(commentSource).to.equal(CommentSourceType.Method);
      });
    });
  });
});
