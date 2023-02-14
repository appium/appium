import {Comment, Reflection} from 'typedoc';
import {CommentSource, KnownMethods} from '../types';

/**
 * A function which queries some object for a {@linkcode Comment}, and if found,
 * its {@linkcode Comment.summary summary}.
 * @internal
 */
export interface CommentFinder {
  getter: (opts: CommentFinderGetterOptions) => Comment | undefined;
  commentSource: CommentSource;
}

/**
 * Options for {@linkcode CommentFinder.getter} functions
 * @internal
 */
export interface CommentFinderGetterOptions {
  refl?: Reflection;
  comment?: Comment;
  knownBuiltinMethods?: KnownMethods;
}

/**
 * A wrapper around a found {@linkcode Comment} which also contains a {@linkcode CommentSource}
 * so we can observe where the `Comment` came from.
 */
export interface CommentData {
  comment: Comment;
  commentSource: CommentSource;
}
