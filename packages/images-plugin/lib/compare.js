import _ from 'lodash';
import {errors} from '@appium/base-driver';
import {getImagesMatches, getImagesSimilarity, getImageOccurrence} from '@appium/opencv';

const MATCH_FEATURES_MODE = 'matchFeatures';
const GET_SIMILARITY_MODE = 'getSimilarity';
const MATCH_TEMPLATE_MODE = 'matchTemplate';

const DEFAULT_MATCH_THRESHOLD = 0.4;

/**
 * Performs images comparison using OpenCV framework features.
 * It is expected that both OpenCV framework and opencv4nodejs
 * module are installed on the machine where Appium server is running.
 *
 * @param {string} mode - One of possible comparison modes:
 * matchFeatures, getSimilarity, matchTemplate
 * @param {string} firstImage - Base64-encoded image file.
 * All image formats, that OpenCV library itself accepts, are supported.
 * @param {string} secondImage - Base64-encoded image file.
 * All image formats, that OpenCV library itself accepts, are supported.
 * @param {?Object} options [{}] - The content of this dictionary depends
 * on the actual `mode` value. See the documentation on `@appium/support`
 * module for more details.
 * @returns {Object} The content of the resulting dictionary depends
 * on the actual `mode` and `options` values. See the documentation on
 * `@appium/support` module for more details.
 * @throws {Error} If required OpenCV modules are not installed or
 * if `mode` value is incorrect or if there was an unexpected issue while
 * matching the images.
 */
async function compareImages(mode, firstImage, secondImage, options = {}) {
  const img1 = Buffer.from(firstImage, 'base64');
  const img2 = Buffer.from(secondImage, 'base64');
  let result = null;
  switch (_.toLower(mode)) {
    case MATCH_FEATURES_MODE.toLowerCase():
      try {
        result = await getImagesMatches(img1, img2, options);
      } catch (err) {
        // might throw if no matches
        result = {count: 0};
      }
      break;
    case GET_SIMILARITY_MODE.toLowerCase():
      result = await getImagesSimilarity(img1, img2, options);
      break;
    case MATCH_TEMPLATE_MODE.toLowerCase():
      // firstImage/img1 is the full image and secondImage/img2 is the partial one
      result = await getImageOccurrence(img1, img2, options);
      if (options.multiple) {
        return result.multiple.map(convertVisualizationToBase64);
      }
      break;
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
 * @param {OccurrenceResult} element - occurrence result
 *
 **/
function convertVisualizationToBase64(element) {
  if (!_.isEmpty(element.visualization)) {
    element.visualization = element.visualization.toString('base64');
  }

  return element;
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
 */
