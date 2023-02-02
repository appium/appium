/**
 * Utilities to derive comments from various sources
 * @module
 */

import _ from 'lodash';
import {SetOptional, ValueOf} from 'type-fest';
import {Comment, CommentTag} from 'typedoc';
import {CommandMethodDeclarationReflection, KnownMethods} from './types';

export const NAME_EXAMPLE_TAG = '@example';

/**
 * Languages which can be used in example code blocks
 *
 * The key is the identifier used in a fenced code block, and the value is the "display" value
 */
export const ExampleLanguage = {
  ts: 'TypeScript',
  typescript: 'TypeScript',
  js: 'JavaScript',
  javascript: 'JavaScript',
  py: 'Python',
  python: 'Python',
  rb: 'Ruby',
  ruby: 'Ruby',
  java: 'Java',
} as const;

/**
 * The beginning of fenced code block looks like this.
 *
 * @todo Ensure the _end_ of the fenced code block exists
 */
const FENCED_CODE_BLOCK_REGEX = /^\s*```(\w+)?/;

/**
 * A function which queries some object for a {@linkcode Comment}, and if found,
 * its {@linkcode Comment.summary summary}.
 * @internal
 */
interface CommentFinder {
  getter: (opts: CommentFinderGetterOptions) => Comment | undefined;
  commentSource: CommentSourceType;
}

/**
 * Options for {@linkcode CommentFinder.getter} functions
 * @internal
 */
interface CommentFinderGetterOptions {
  refl?: CommandMethodDeclarationReflection;
  comment?: Comment;
  knownMethods?: KnownMethods;
}

/**
 * A wrapper around a found {@linkcode Comment} which also contains a {@linkcode CommentSourceType}
 * so we can observe where the `Comment` came from.
 */
export interface CommentData {
  comment: Comment;
  commentSource: CommentSourceType;
}

/**
 * This is basically a fenced code block split into two portions: the text itself and the language
 * specified in the opening fence.  Part of {@linkcode ExtractedExamples}
 */
export interface Example {
  text: string;
  lang: ValueOf<typeof ExampleLanguage>;
}

/**
 * A pair of a comment and any examples which were removed from it.  Returned by {@linkcode extractExamples}
 */
export interface ExtractedExamples {
  examples?: Example[];
  comment: Comment;
}

/**
 * Mainly for debugging purposes, these tell us (roughly) where a comment came from.
 * In the case of {@linkcode CommentSourceType.Multiple}, the comment was derived
 * from multiple sources.
 * @internal
 */
export enum CommentSourceType {
  /**
   * This is a comment directly on the `DeclarationReference` itself.
   *
   * It's unclear to me why sometimes comments are attached to the method proper or its signature;
   * might have something to do with `ReferenceType`.
   */
  Method = 'method',
  /**
   * A comment attached to the method's call signature.
   */
  MethodSignature = 'method-signature',
  /**
   * A comment from "elsewhere", which is usually a method map or exec method map.
   */
  OtherComment = 'other-comment',
  /**
   * A comment coming out of the `@appium/types` package; specifically a method in `ExternalDriver`
   */
  OtherMethod = 'builtin-interface',
  /**
   * A comment _built_ from any of the above sources from one or more `DeclarationReference`
   * objects.  For example, the summary (description) of an implementation of `doubleClick()` and
   * the `@example` block tag from the `ExternalDriver` interface.
   */
  Multiple = 'multiple',
}

/**
 * Options for {@linkcode deriveComment}
 */
interface DeriveCommentOptions {
  refl?: CommandMethodDeclarationReflection;
  comment?: Comment;
  knownMethods?: KnownMethods;
}

const knownComments: Map<string, Comment> = new Map();

/**
 * Array of strategies for finding comments.  They can come from a variety of places depending on
 * where a variable is declared, if it overrides a method, if it implements a method in an
 * interface, etc.
 *
 * These have an order (of precedence), which is why this is an array.
 */
const commentFinders: Readonly<CommentFinder[]> = [
  {
    /**
     *
     * @returns A comment probably from the method map itself
     */
    getter: ({comment}) => comment,
    commentSource: CommentSourceType.OtherComment,
  },
  {
    /**
     * @returns The comment on the method itself
     */
    getter: ({refl}) => refl?.comment,
    commentSource: CommentSourceType.Method,
  },
  {
    /**
     * @returns The comment from the method's signature (may be inherited)
     */
    getter: ({refl}) => refl?.getAllSignatures().find((sig) => sig.comment?.summary)?.comment,
    commentSource: CommentSourceType.MethodSignature,
  },
  {
    /**
     * @returns The comment from some method that this one implements or overwrites or w/e;
     * typically coming from interfaces in `@appium/types`
     */
    getter: ({refl, knownMethods}) => {
      if (refl && knownComments.has(refl.name)) {
        return knownComments.get(refl.name);
      }
      // if the `refl` is a known command, it should be in `knownMethods`;
      // if it isn't (or doesn't exist) we aren't going to display it anyway, so abort
      const otherRefl = refl && knownMethods?.get(refl.name);
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
      const comment = commentFinders
        .filter(({commentSource}) => commentSource !== CommentSourceType.OtherMethod)
        .map(({getter, commentSource}) => ({
          comment: getter({refl: otherRefl, knownMethods}),
          commentSource,
        }))
        .find(({comment}) => Boolean(comment))?.comment;
      if (comment) {
        knownComments.set(refl.name, comment);
      }
      return comment;
    },
    commentSource: CommentSourceType.OtherMethod,
  },
];

/**
 * Tries to figure out a comment for a command
 * @param opts Options
 * @returns A {@linkcode CommentData} containing a {@linkcode Comment}, if one can be found
 * @internal
 */
export function deriveComment(opts: DeriveCommentOptions = {}): CommentData | undefined {
  const {refl, comment, knownMethods} = opts;
  /**
   * The result of running thru all of the comment finders. Each value will have a
   * {@linkcode CommentSourceType} corresponding to the finder, and the a `comment` property _if and
   * only if_ a {@linkcode Comment} was found.
   */
  const rawCommentData: SetOptional<CommentData, 'comment'>[] = commentFinders.map(
    ({getter, commentSource}) => ({
      comment: getter({refl, comment, knownMethods}),
      commentSource,
    })
  );

  /**
   * The result of filtering out any {@linkcode CommentData} objects which do not have a `comment` property
   * _or_ which do but the {@linkcode Comment} property does not have any visible components.
   *
   * A comment without visible components is defined by TypeDoc as one without a "summary" (or an
   * empty summary) and one which has no block tags. Block tags, by definition, display something.
   */
  const commentData: CommentData[] = rawCommentData.filter(({comment}) =>
    comment?.hasVisibleComponent()
  ) as CommentData[];

  // the first summary found; this is where precedence comes in to play
  const summaryCommentData = commentData.find(({comment}) => comment.summary?.length);

  // get a big pile of block tags from all sources, and pick the first from each unique tag
  const allBlockTags = commentData.flatMap(({comment}) => comment.blockTags);
  const uniqueBlockTags = _.uniqBy(allBlockTags, 'tag');

  // if we have a summary comment and some block tags, and the block tags are not the same as the
  // summary comment's block tags, then create a new comment merged from the summary and all block
  // tags.
  // note that by definition `uniqueBlockTags` will contain all tags in the summary comment's
  // `blockTags` prop
  if (
    summaryCommentData &&
    uniqueBlockTags.length &&
    _.xor(summaryCommentData.comment.blockTags, uniqueBlockTags).length
  ) {
    const comment = cloneComment(summaryCommentData.comment, uniqueBlockTags);

    return {comment, commentSource: CommentSourceType.Multiple};
  }

  // pick the first one found
  return _.first(commentData);
}

/**
 * Clones a comment. Mostly. I think.
 * @param comment Comment to clone
 * @param blockTags Block tags to use; if not provided, the comment's block tags will be used (these
 * are also cloned)
 * @returns A new comment
 */
export function cloneComment(comment: Comment, blockTags?: CommentTag[]): Comment {
  const newComment = new Comment(
    Comment.cloneDisplayParts(comment.summary),
    (blockTags ?? comment.blockTags).map((blockTag) => {
      const tag = new CommentTag(blockTag.tag, Comment.cloneDisplayParts(blockTag.content));
      tag.name = blockTag.name;
      return tag;
    })
  );
  newComment.modifierTags = new Set(comment.modifierTags);

  return newComment;
}

/**
 * Type guard to narrow a string to a key of {@linkcode ExampleLanguage}
 * @param value anything
 * @returns `true` if the value is a valid language
 */
function isValidLang(value: any): value is keyof typeof ExampleLanguage {
  return value in ExampleLanguage;
}

/**
 * Finds any `@example` tags within a comment and creates an {@linkcode ExtractedExamples} object
 * for them. Creates a new comment with the examples removed, so we can handle them in a
 * custom way via our theme.
 *
 * Note that the same `Comment` can be passed multiple times (if it is displayed in multiple
 * modules).  Our choices are either to a) clone the comment each time, or b) memoize the function
 * in order to avoid a problem wherein the comment has its examples extracted on the first call, but
 * subsequent calls will not contain any examples (since they've already been extracted).  It may be
 * more memory-friendly to memoize, but it may not be the safest thing to do (unclear).
 *
 * @param comment A comment to extract examples from
 * @returns New comment (with examples removed)
 */
export const extractExamples = (comment?: Comment): ExtractedExamples | undefined => {
  if (!comment) {
    return;
  }

  comment = cloneComment(comment);

  const exampleTags = comment.getTags(NAME_EXAMPLE_TAG);

  if (!exampleTags) {
    return {comment};
  }

  const examples = exampleTags.flatMap(({content}) =>
    content.reduce((examples, {text}) => {
      const match = text.match(FENCED_CODE_BLOCK_REGEX);
      if (match) {
        const matchedLang = match[1] ?? 'js';
        const lang = isValidLang(matchedLang) ? matchedLang : 'js';
        return [
          ...examples,
          {
            lang: ExampleLanguage[lang],
            text,
          },
        ];
      }
      return examples;
    }, [] as Example[])
  );

  if (examples.length) {
    comment.removeTags(NAME_EXAMPLE_TAG);
    return {examples, comment};
  }
  return {comment};
};
