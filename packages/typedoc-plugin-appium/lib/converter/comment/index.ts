/**
 * Utilities to derive comments from various sources
 * @module
 */

import _ from 'lodash';
import {SetOptional} from 'type-fest';
import {Comment, CommentTag, Reflection} from 'typedoc';
import {CommentSource, Example, ExampleLanguage, ExtractedExamples, KnownMethods} from '../types';
import {getFinders} from './finder';
import {CommentData} from './types';
import {fallbackLogger} from '../../logger';

const log = fallbackLogger.createChildLogger('comment');

export const NAME_EXAMPLE_TAG = '@example';

/**
 * The beginning of fenced code block looks like this.
 *
 * @todo Ensure the _end_ of the fenced code block exists
 */
const FENCED_CODE_BLOCK_REGEX = /^\s*```(\w+)?/;

/**
 * Options for {@linkcode deriveComment}
 */
interface DeriveCommentOptions {
  refl?: Reflection;
  comment?: Comment;
  knownMethods?: KnownMethods;
}
/**
 * Tries to figure out a comment for a command
 * @param opts Options
 * @returns A {@linkcode CommentData} containing a {@linkcode Comment}, if one can be found
 * @internal
 */
export function deriveComment(opts: DeriveCommentOptions = {}): CommentData | undefined {
  const {refl, comment, knownMethods} = opts;

  const commentFinders = getFinders(refl);

  /**
   * The result of running thru all of the comment finders. Each value will have a
   * {@linkcode CommentSource} corresponding to the finder, and the a `comment` property _if and
   * only if_ a {@linkcode Comment} was found.
   */
  const rawCommentData: SetOptional<CommentData, 'comment'>[] = commentFinders.map(
    ({getter, commentSource}) => ({
      comment: getter({refl, comment, knownBuiltinMethods: knownMethods}),
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
  const summaryCommentData = commentData.find(({comment}) => comment.summary.length);

  // in this bit we want to pull all block tags from all comments, and see which have content and
  // which don't.  for each tag name (e.g., `@returns`), prefer the tag with content.  if there is
  // no such tag, just pick the first one
  const allBlockTags = commentData.flatMap(({comment}) => comment.blockTags);
  const tagsByTag = _.groupBy(allBlockTags, 'tag');
  const finalBlockTags: CommentTag[] = [];
  for (const tags of Object.values(tagsByTag)) {
    if (tags.length === 1) {
      finalBlockTags.push(tags[0]);
    } else if (tags.length > 1) {
      // prefer a tag with content
      const tag = tags.find((t) => t.content.length) ?? tags[0];
      finalBlockTags.push(tag);
    } else {
      if (refl) {
        log.warn(
          'No comment tags found in derived comment for %s "%s". This is a bug',
          refl.constructor.name,
          refl.name
        );
      }
    }
  }

  // if we have a summary comment and some block tags, and the block tags are not the same as the
  // summary comment's block tags, then create a new comment merged from the summary and all block
  // tags.
  if (
    summaryCommentData &&
    finalBlockTags.length &&
    _.xor(summaryCommentData.comment.blockTags, finalBlockTags).length
  ) {
    const comment = cloneComment(summaryCommentData.comment, finalBlockTags);

    return {comment, commentSource: CommentSource.Multiple};
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
