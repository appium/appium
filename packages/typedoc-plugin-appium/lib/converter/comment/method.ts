import {Comment} from 'typedoc';
import {isDeclarationReflection, isReflectionType} from '../../guards';
import {CommentSource} from '../types';
import {CommentFinder} from './types';

const knownDeclarationRefComments: Map<string, Comment> = new Map();

/**
 * Array of strategies for finding comments.  They can come from a variety of places depending on
 * where a variable is declared, if it overrides a method, if it implements a method in an
 * interface, etc.
 *
 * These have an order (of precedence), which is why this is an array.
 */
const MethodCommentFinders: Readonly<CommentFinder[]> = [
  {
    /**
     * @returns The comment on the method itself
     */
    getter({refl}) {
      return refl?.comment?.hasVisibleComponent() ? refl.comment : undefined;
    },
    commentSource: CommentSource.Method,
  },
  {
    /**
     * @returns The comment from the method's signature (may be inherited or from a `ReflectionType`'s declaration)
     */
    getter: ({refl}) => {
      if (isDeclarationReflection(refl)) {
        let comment = refl.getAllSignatures().find((sig) => sig.comment?.summary)?.comment;
        if (comment) {
          return comment;
        }
        if (isReflectionType(refl.type)) {
          comment = refl.type.declaration
            .getAllSignatures()
            .find((sig) => sig.comment?.summary)?.comment;
        }
        return comment;
      }
    },
    commentSource: CommentSource.MethodSignature,
  },
  {
    /**
     * @returns The comment from some method that this one implements or overwrites or w/e;
     * typically coming from interfaces in `@appium/types`
     */
    getter: ({refl, knownBuiltinMethods}) => {
      if (!refl) {
        return;
      }
      if (knownDeclarationRefComments.has(refl.name)) {
        return knownDeclarationRefComments.get(refl.name);
      }
      // if the `refl` is a known command, it should be in `knownMethods`;
      // if it isn't (or doesn't exist) we aren't going to display it anyway, so abort
      const otherRefl = refl && knownBuiltinMethods?.get(refl.name);
      if (!otherRefl) {
        return;
      }

      // if `otherRefl` exists, then the comment could live in several places,
      // which happen to be findable by the _other_ `CommentFinder`s.  we avoid
      // `CommentSourceType.OtherMethod`, which corresponds to _this_ `CommentFinder`
      // to avoid recursion (for now).
      //
      // after looping thru the finders, if we have a comment in the list of `commentData`
      // objects, return the first one found.
      const comment = MethodCommentFinders.filter(
        ({commentSource}) => commentSource !== CommentSource.OtherMethod
      )
        .map(({getter, commentSource}) => ({
          comment: getter({refl: otherRefl, knownBuiltinMethods}),
          commentSource,
        }))
        .find(({comment}) => Boolean(comment))?.comment;
      if (comment) {
        knownDeclarationRefComments.set(refl.name, comment);
      }
      return comment;
    },
    commentSource: CommentSource.OtherMethod,
  },
];

export default MethodCommentFinders;
