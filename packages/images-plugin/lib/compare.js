import _ from 'lodash';
import {errors} from 'appium/driver';
import {getImagesMatches, getImagesSimilarity, getImageOccurrence} from '@appium/opencv';
import {MATCH_FEATURES_MODE, GET_SIMILARITY_MODE, MATCH_TEMPLATE_MODE} from './constants';

/**
 * @typedef {{visualization: string|null|undefined}} Visualized
 * @typedef {import('@appium/opencv').MatchingResult & Visualized} MatchingResult
 * @typedef {import('@appium/opencv').OccurrenceResult & Visualized} OccurrenceResult
 * @typedef {import('@appium/opencv').SimilarityResult & Visualized} SimilarityResult
 * @typedef {MatchingResult|OccurrenceResult|SimilarityResult|SimilarityResult[]} ComparisonResult
 */

/**
 * Performs images comparison using OpenCV framework features.
 * It is expected that both OpenCV framework and opencv4nodejs
 * module are installed on the machine where Appium server is running.
 *
 * @param {string} mode - One of possible comparison modes:
 * matchFeatures, getSimilarity, matchTemplate
 * @param {string|Buffer} firstImage - Base64-encoded image file.
 * All image formats, that OpenCV library itself accepts, are supported.
 * @param {string|Buffer} secondImage - Base64-encoded image file.
 * All image formats, that OpenCV library itself accepts, are supported.
 * @param {import('@appium/opencv').MatchingOptions
 * |import('@appium/opencv').SimilarityOptions
 * |import('@appium/opencv').OccurrenceOptions} [options={}] - The content of this dictionary depends
 * on the actual `mode` value. See the documentation on `@appium/support`
 * module for more details.
 * @returns {Promise<ComparisonResult>} The content of the resulting dictionary depends
 * on the actual `mode` and `options` values. See the documentation on
 * `@appium/support` module for more details.
 * @throws {Error} If required OpenCV modules are not installed or
 * if `mode` value is incorrect or if there was an unexpected issue while
 * matching the images.
 */
async function compareImages(mode, firstImage, secondImage, options = {}) {
  const img1 = Buffer.isBuffer(firstImage) ? firstImage : Buffer.from(firstImage, 'base64');
  const img2 = Buffer.isBuffer(secondImage) ? secondImage : Buffer.from(secondImage, 'base64');
  let result;
  switch (_.toLower(mode)) {
    case MATCH_FEATURES_MODE.toLowerCase():
      try {
        result = await getImagesMatches(
          img1, img2, /** @type {import('@appium/opencv').MatchingOptions} */(options)
        );
      } catch {
        // might throw if no matches
        result = /** @type {import('@appium/opencv').MatchingResult} */({count: 0});
      }
      break;
    case GET_SIMILARITY_MODE.toLowerCase():
      result = await getImagesSimilarity(
        img1, img2, /** @type {import('@appium/opencv').SimilarityOptions} */(options));
      break;
    case MATCH_TEMPLATE_MODE.toLowerCase(): {
      const opts = /** @type {import('@appium/opencv').OccurrenceOptions} */(options);
      // firstImage/img1 is the full image and secondImage/img2 is the partial one
      result = await getImageOccurrence(
        img1, img2, opts
      );
      if (opts.multiple && result.multiple) {
        return result.multiple.map(convertVisualizationToBase64);
      }
      break;
    }
    default:
      throw new errors.InvalidArgumentError(
        `'${mode}' images comparison mode is unknown. ` +
          `Only ${JSON.stringify([
            MATCH_FEATURES_MODE,
            GET_SIMILARITY_MODE,
            MATCH_TEMPLATE_MODE,
          ])} modes are supported.`
      );
  }
  return convertVisualizationToBase64(result);
}

/**
 * base64 encodes the visualization part of the result
 * (if necessary)
 *
 * @param {Partial<{visualization: Buffer|null}>} element - occurrence result
 * @returns {any} I know this looks ugly from the typing perspective
 **/
function convertVisualizationToBase64(element) {
  return Buffer.isBuffer(element.visualization)
    ? {
      ...(element),
      visualization: element.visualization.toString('base64')
    }
    : element;
}

export {compareImages};
