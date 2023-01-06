/**
 * Utilities to derive comments from various sources
 * @module
 */

import _ from 'lodash';
import {Comment, CommentDisplayPart} from 'typedoc';
import {AsyncMethodDeclarationReflection, KnownMethods} from './types';

export const stats = _.fill(new Array(5), 0);

/**
 * Tries to figure out a comment for a command
 * @param knownMethods Known method map
 * @param command Name of method
 * @param refl Method reflection, if any
 * @param extraComment Comment from somewhere else (typically the method map), if any
 * @returns A `Comment`, if one can be found
 * @internal
 */
export function deriveComment(
  command: string,
  knownMethods?: KnownMethods,
  refl?: AsyncMethodDeclarationReflection,
  extraComment?: Comment
): CommentData | undefined {
  const commentFinders: CommentFinder[] = [
    {
      /**
       * @returns The comment on the method itself
       */
      getter: () => refl?.comment?.summary,
      commentSource: CommentSourceType.Method,
    },
    {
      /**
       * @returns The comment from the inherited method
       */
      getter: () => refl?.inheritedFrom?.reflection?.comment?.summary,
      commentSource: CommentSourceType.MethodInheritedFrom,
    },
    {
      /**
       * @returns The comment from the method's signature
       */
      getter: () => refl?.getAllSignatures().find((sig) => sig.comment?.summary)?.comment?.summary,
      commentSource: CommentSourceType.MethodSignature,
    },
    {
      /**
       *
       * @returns The comment from the interface's method signature
       */
      getter: () =>
        knownMethods
          ?.get(command)
          ?.method.getAllSignatures()
          .find((sig) => sig.comment?.summary)?.comment?.summary,
      commentSource: CommentSourceType.BuiltinMethodSignature,
    },
    {
      /**
       *
       * @returns A comment probably from the method map itself
       */
      getter: () => extraComment?.summary,
      commentSource: CommentSourceType.OtherComment,
    },
  ];

  for (const [idx, {getter, commentSource}] of commentFinders.entries()) {
    const commentParts = getter();
    stats[idx] = stats[idx] + Number(Boolean(commentParts?.length));
    if (commentParts?.length) {
      return {
        comment: new Comment(commentParts),
        commentSource,
      };
    }
  }
}

export enum CommentSourceType {
  Method = 'method',
  MethodInheritedFrom = 'method-inherited-from',
  MethodSignature = 'method-signature',
  BuiltinMethodSignature = 'builtin-method-signature',
  OtherComment = 'other-comment',
}

/**
 * A function which queries some object for a {@linkcode Comment}, and if found,
 * its {@linkcode Comment.summary summary}.
 * @internal
 */
interface CommentFinder {
  getter: () => CommentDisplayPart[] | undefined;
  commentSource: CommentSourceType;
}

export interface CommentData {
  comment: Comment;
  commentSource: CommentSourceType;
}
