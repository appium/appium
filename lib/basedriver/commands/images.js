import _ from 'lodash';
import { errors } from '../../protocol/errors';
import { imageUtil } from 'appium-support';

const commands = {}, helpers = {}, extensions = {};

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
 * on the actual `mode` value.
 * For MATCH_TEMPLATE_MODE:
 *   - visualize: include the visualization of the match in the result
 *                (default: false)
 *   - threshold: the image match threshold, higher values
 *                require a closer image similarity to match
 *                (default: 0.5)
 *   - multiple: return multiple matches in the image
 *               (default: false)
 *   - matchNeighbourThreshold: if multiple is specified,
 *                              determine the number of pixels within
 *                              which to consider a pixel as part of the
 *                              same match result
 *                              (default: 10)
 * See the documentation in the `appium-support`
 * module for more details.
 * @returns {Object} The content of the resulting dictionary depends
 * on the actual `mode` and `options` values. See the documentation on
 * `appium-support` module for more details.
 * @throws {Error} If required OpenCV modules are not installed or
 * if `mode` value is incorrect or if there was an unexpected issue while
 * matching the images.
 */
commands.compareImages = async function compareImages (mode, firstImage, secondImage, options = {}) {
  const img1 = Buffer.from(firstImage, 'base64');
  const img2 = Buffer.from(secondImage, 'base64');
  let result = null;

  switch (_.toLower(mode)) {
    case MATCH_FEATURES_MODE.toLowerCase():
      result = await imageUtil.getImagesMatches(img1, img2, options);
      break;
    case GET_SIMILARITY_MODE.toLowerCase():
      result = await imageUtil.getImagesSimilarity(img1, img2, options);
      break;
    case MATCH_TEMPLATE_MODE.toLowerCase():
      // firstImage/img1 is the full image and secondImage/img2 is the partial one
      result = await imageUtil.getImageOccurrence(img1, img2, options);

      if (options.multiple) {
        return result.multiple.map(convertVisualizationToBase64);
      }
      break;
    default:
      throw new errors.InvalidArgumentError(`'${mode}' images comparison mode is unknown. ` +
        `Only ${JSON.stringify([MATCH_FEATURES_MODE, GET_SIMILARITY_MODE, MATCH_TEMPLATE_MODE])} modes are supported.`);
  }

  return convertVisualizationToBase64(result);
};

/**
 * base64 encodes the visualization part of the result
 * (if necessary)
 *
 * @param {OccurenceResult} element - occurrence result
 *
 **/
function convertVisualizationToBase64 (element) {
  if (_.isString(element.visualization)) {
    element.visualization = element.visualization.toString('base64');
  }

  return element;
}

Object.assign(extensions, commands, helpers);
export { commands, helpers, DEFAULT_MATCH_THRESHOLD, MATCH_TEMPLATE_MODE };
export default extensions;
