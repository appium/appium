import _ from 'lodash';
import {errors} from 'appium/driver';
import {
  getImagesMatches,
  getImagesSimilarity,
  getImageOccurrence,
  type MatchingResult,
  type OccurrenceResult,
  type SimilarityResult,
  type MatchingOptions,
  type SimilarityOptions,
  type OccurrenceOptions,
} from '@appium/opencv';
import {MATCH_FEATURES_MODE, GET_SIMILARITY_MODE, MATCH_TEMPLATE_MODE} from './constants';
import type {ComparisonResult} from './types';

/**
 * Performs images comparison using OpenCV framework features.
 * It is expected that both OpenCV framework and opencv4nodejs
 * module are installed on the machine where Appium server is running.
 *
 * @param mode - One of possible comparison modes:
 * matchFeatures, getSimilarity, matchTemplate
 * @param firstImage - Base64-encoded image file.
 * All image formats, that OpenCV library itself accepts, are supported.
 * @param secondImage - Base64-encoded image file.
 * All image formats, that OpenCV library itself accepts, are supported.
 * @param options - The content of this dictionary depends
 * on the actual `mode` value. See the documentation on `@appium/support`
 * module for more details.
 * @returns The content of the resulting dictionary depends
 * on the actual `mode` and `options` values. See the documentation on
 * `@appium/support` module for more details.
 * @throws {Error} If required OpenCV modules are not installed or
 * if `mode` value is incorrect or if there was an unexpected issue while
 * matching the images.
 */
export async function compareImages(
  mode: string,
  firstImage: string | Buffer,
  secondImage: string | Buffer,
  options: MatchingOptions | SimilarityOptions | OccurrenceOptions = {}
): Promise<ComparisonResult> {
  const img1 = Buffer.isBuffer(firstImage) ? firstImage : Buffer.from(firstImage, 'base64');
  const img2 = Buffer.isBuffer(secondImage) ? secondImage : Buffer.from(secondImage, 'base64');
  let result: MatchingResult | SimilarityResult | OccurrenceResult;
  switch (_.toLower(mode)) {
    case MATCH_FEATURES_MODE.toLowerCase():
      try {
        result = await getImagesMatches(img1, img2, options as MatchingOptions);
      } catch {
        // might throw if no matches
        result = {count: 0} as MatchingResult;
      }
      break;
    case GET_SIMILARITY_MODE.toLowerCase():
      result = await getImagesSimilarity(img1, img2, options as SimilarityOptions);
      break;
    case MATCH_TEMPLATE_MODE.toLowerCase(): {
      const opts = options as OccurrenceOptions;
      // firstImage/img1 is the full image and secondImage/img2 is the partial one
      result = await getImageOccurrence(img1, img2, opts);
      if (opts.multiple && (result as OccurrenceResult).multiple) {
        const multipleResults = (result as OccurrenceResult).multiple;
        if (multipleResults) {
          return multipleResults.map(convertVisualizationToBase64);
        }
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
 * @param element - occurrence result
 * @returns result with base64-encoded visualization
 **/
function convertVisualizationToBase64(
  element: Partial<{visualization: Buffer | null}>
): any {
  return Buffer.isBuffer(element.visualization)
    ? {
        ...element,
        visualization: element.visualization.toString('base64'),
      }
    : element;
}
