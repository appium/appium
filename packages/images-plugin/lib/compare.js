import _ from 'lodash';
import {errors} from 'appium/driver';
import {getImagesMatches, getImagesSimilarity, getImageOccurrence} from '@appium/opencv';

const MATCH_FEATURES_MODE = 'matchFeatures';
const GET_SIMILARITY_MODE = 'getSimilarity';
const MATCH_TEMPLATE_MODE = 'matchTemplate';

const DEFAULT_MATCH_THRESHOLD = 0.4;

/**
 * @param {CompareMode} value
 * @returns {value is MatchFeaturesMode}
 */
function isMatchFeaturesMode(value) {
  return _.toLower(value) === MATCH_FEATURES_MODE.toLowerCase();
}

/**
 * @param {CompareMode} value
 * @returns {value is GetSimilarityMode}
 */
function isGetSimilarityMode(value) {
  return _.toLower(value) === GET_SIMILARITY_MODE.toLowerCase();
}

/**
 * @param {CompareMode} value
 * @returns {value is MatchTemplateMode}
 */
function isMatchTemplateMode(value) {
  return _.toLower(value) === MATCH_TEMPLATE_MODE.toLowerCase();
}

/**
 * Performs images comparison using OpenCV framework features.
 * It is expected that both OpenCV framework and opencv4nodejs
 * module are installed on the machine where Appium server is running.
 *
 * @template {CompareMode} Mode
 * @template {boolean} Multiple
 * @param {Mode} mode - One of possible comparison modes:
 * matchFeatures, getSimilarity, matchTemplate
 * @param {string} firstImage - Base64-encoded image file.
 * All image formats, that OpenCV library itself accepts, are supported.
 * @param {string} secondImage - Base64-encoded image file.
 * All image formats, that OpenCV library itself accepts, are supported.
 * @param {CompareImagesOptions<Mode,Multiple>} [options] - The content of this dictionary depends
 * on the actual `mode` value. See the documentation on `@appium/support`
 * module for more details.
 * @returns {Promise<CompareImagesResult<Mode,Multiple>>} The content of the resulting dictionary depends
 * on the actual `mode` and `options` values. See the documentation on
 * `@appium/support` module for more details.
 * @throws {Error} If required OpenCV modules are not installed or
 * if `mode` value is incorrect or if there was an unexpected issue while
 * matching the images.
 */
async function compareImages(
  mode,
  firstImage,
  secondImage,
  options = /** @type {CompareImagesOptions<Mode,Multiple>} */ ({})
) {
  const img1 = Buffer.from(firstImage, 'base64');
  const img2 = Buffer.from(secondImage, 'base64');

  if (isMatchFeaturesMode(mode)) {
    const opts = /** @type {MatchingOptions} */ (options);
    /** @type {MatchingResult} */
    let result;
    try {
      result = await getImagesMatches(img1, img2, opts);
    } catch (err) {
      // might throw if no matches
      result = {count: 0};
    }
    return /** @type {CompareImagesResult<Mode,Multiple>} */ (result);
  }

  if (isGetSimilarityMode(mode)) {
    const opts = /** @type {SimilarityOptions} */ (options);
    return /** @type {CompareImagesResult<Mode,Multiple>} */ (
      await getImagesSimilarity(img1, img2, opts)
    );
  }

  if (isMatchTemplateMode(mode)) {
    const opts = /** @type {OccurrenceOptions<Multiple>} */ (options);
    const result = await getImageOccurrence(img1, img2, opts);
    return /** @type {CompareImagesResult<Mode,Multiple>} */ (
      opts.multiple ? result.multiple : result
    );
  }

  throw new errors.InvalidArgumentError(
    `Image comparison mode "${mode}" is invalid. Valid modes: ${MATCH_FEATURES_MODE}, ${GET_SIMILARITY_MODE}, ${MATCH_TEMPLATE_MODE}`
  );
}

export {
  compareImages,
  DEFAULT_MATCH_THRESHOLD,
  MATCH_TEMPLATE_MODE,
  MATCH_FEATURES_MODE,
  GET_SIMILARITY_MODE,
};

/**
 * @typedef {import('@appium/opencv').OccurrenceResult} OccurrenceResult
 * @typedef {import('@appium/opencv').SimilarityOptions} SimilarityOptions
 * @typedef {import('@appium/opencv').MatchingOptions} MatchingOptions
 * @typedef {import('@appium/opencv').SimilarityResult} SimilarityResult
 * @typedef {import('@appium/opencv').MatchingResult} MatchingResult
 */

/**
 * @template {boolean} Multiple
 * @typedef {import('@appium/opencv').OccurrenceOptions<Multiple>} OccurrenceOptions

 */

/**
 * @typedef {typeof GET_SIMILARITY_MODE} GetSimilarityMode
 * @typedef {typeof MATCH_FEATURES_MODE} MatchFeaturesMode
 * @typedef {typeof MATCH_TEMPLATE_MODE} MatchTemplateMode
 * @typedef {GetSimilarityMode|MatchFeaturesMode|MatchTemplateMode} CompareMode
 */

/**
 * @template {CompareMode} Mode
 * @template {boolean} Multiple
 * @typedef {Mode extends GetSimilarityMode ? SimilarityOptions : Mode extends MatchFeaturesMode ? MatchingOptions : Mode extends MatchTemplateMode ? OccurrenceOptions<Multiple> : never} CompareImagesOptions
 */

/**
 * @template {CompareMode} Mode
 * @template {boolean} Multiple
 * @typedef {Mode extends GetSimilarityMode ? SimilarityResult : Mode extends MatchFeaturesMode ? MatchingResult : Mode extends MatchTemplateMode ? (Multiple extends true ? OccurrenceResult[] : OccurrenceResult) : never} CompareImagesResult
 */
