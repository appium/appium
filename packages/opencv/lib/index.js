import _ from 'lodash';
import Jimp from 'jimp';
import {Buffer} from 'buffer';
import B from 'bluebird';

/** @type {any} */
let cv;

const DEFAULT_MATCH_THRESHOLD = 0.5;
const MATCH_NEIGHBOUR_THRESHOLD = 10;

const AVAILABLE_DETECTORS = {
  AKAZE: 'AKAZE',
  AGAST: 'AgastFeatureDetector',
  BRISK: 'BRISK',
  FAST: 'FastFeatureDetector',
  GFTT: 'GFTTDetector',
  KAZE: 'KAZE',
  MSER: 'MSER',
  ORB: 'ORB',
};

const AVAILABLE_MATCHING_FUNCTIONS = {
  FlannBased: 'FlannBased',
  BruteForce: 'BruteForce',
  BruteForceL1: 'BruteForce-L1',
  BruteForceHamming: 'BruteForce-Hamming',
  BruteForceHammingLut: 'BruteForce-HammingLUT',
  BruteForceSL2: 'BruteForce-SL2',
};

const MATCHING_METHODS = [
  'TM_CCOEFF',
  'TM_CCOEFF_NORMED',
  'TM_CCORR',
  'TM_CCORR_NORMED',
  'TM_SQDIFF',
  'TM_SQDIFF_NORMED',
];
const DEFAULT_MATCHING_METHOD = 'TM_CCOEFF_NORMED';

/**
 * Transforms matching method name to the actual
 * constant value from OpenCV library
 *
 * @param {string} name One of supported method names
 * (see MATCHING_METHODS array above)
 * @returns {number} The method value
 * @throws {Error} if an unsupported method name is given
 */
function toMatchingMethod(name) {
  if (!MATCHING_METHODS.includes(name)) {
    throw new Error(
      `The matching method '${name}' is unknown. ` +
        `Only the following matching methods are supported: ${MATCHING_METHODS}`
    );
  }
  return cv[name];
}

/**
 * Spins until the opencv-bindings module is fully loaded
 */
async function initOpenCv() {
  cv = require('opencv-bindings');
  while (!cv.getBuildInformation) {
    await B.delay(500);
  }
  // opencv-bindings sets a global unhandledRejection handler of an abort, which we don't want, so
  // undo it here. https://github.com/opencv/opencv/issues/21481
  process.removeAllListeners('unhandledRejection');
}

/**
 * @typedef MatchComputationResult
 * @property {OpenCVBindings['Mat']} descriptor - OpenCV match descriptor
 * @property {OpenCVBindings['KeyPointVector']} keyPoints - The array of key points
 */

/**
 * Calculates an OpenCV match descriptor of an image, which can be used
 * for brute-force matching.
 * Read https://docs.opencv.org/3.0-beta/doc/py_tutorials/py_feature2d/py_matcher/py_matcher.html
 * for more details.
 *
 * @param {OpenCVBindings['Mat']} img Image data
 * @param {OpenCVBindings['FeatureDetector']} detector OpenCV feature detector instance
 *
 * @returns {MatchComputationResult}
 */
function detectAndCompute(img, detector) {
  const keyPoints = new cv.KeyPointVector();
  const descriptor = new cv.Mat();
  detector.detect(img, keyPoints);
  detector.compute(img, keyPoints, descriptor);
  return {
    keyPoints,
    descriptor,
  };
}

/**
 * Calculated the bounding rect coordinates for the array of matching points
 *
 * @param {Point[]} matchedPoints Array of matching points
 * @returns {Rect} The matching bounding rect or a zero rect if no match
 * can be found.
 */
function calculateMatchedRect(matchedPoints) {
  if (matchedPoints.length < 2) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  const pointsSortedByDistance = matchedPoints
    .map(
      (point) =>
        /** @type {[number, point]} */ ([Math.sqrt(point.x * point.x + point.y * point.y), point])
    )
    .sort((pair1, pair2) => Number(pair1[0] >= pair2[0]))
    .map((pair) => pair[1]);
  const firstPoint = /** @type {Point} */ (_.head(pointsSortedByDistance));
  const lastPoint = /** @type {Point} */ (_.last(pointsSortedByDistance));
  const topLeftPoint = {
    x: firstPoint.x <= lastPoint.x ? firstPoint.x : lastPoint.x,
    y: firstPoint.y <= lastPoint.y ? firstPoint.y : lastPoint.y,
  };
  const bottomRightPoint = {
    x: firstPoint.x >= lastPoint.x ? firstPoint.x : lastPoint.x,
    y: firstPoint.y >= lastPoint.y ? firstPoint.y : lastPoint.y,
  };
  return {
    x: topLeftPoint.x,
    y: topLeftPoint.y,
    width: bottomRightPoint.x - topLeftPoint.x,
    height: bottomRightPoint.y - topLeftPoint.y,
  };
}

/**
 * Draws a rectanngle on the given image matrix
 *
 * @param {OpenCVBindings['Mat']} mat The source image
 * @param {Rect} region The region to highlight
 *
 * @returns {OpenCVBindings['Mat']} The same image with the rectangle on it
 */
function highlightRegion(mat, region) {
  if (region.width <= 0 || region.height <= 0) {
    return;
  }

  // highlight in red
  const color = new cv.Scalar(255, 0, 0, 255);
  const thickness = 2;
  const topLeft = new cv.Point(region.x, region.y);
  const botRight = new cv.Point(region.x + region.width, region.y + region.height);
  cv.rectangle(mat, topLeft, botRight, color, thickness, cv.LINE_8, 0);
  return mat;
}

/**
 * Calculates the count of common edges between two images.
 * The images might be rotated or resized relatively to each other.
 *
 * @param {Buffer} img1Data The data of the first image packed into a NodeJS buffer
 * @param {Buffer} img2Data The data of the second image packed into a NodeJS buffer
 * @param {MatchingOptions} [options] Set of matching options
 *
 * @returns {Promise<MatchingResult>} Maching result
 * @throws {Error} If `detectorName` value is unknown.
 */
async function getImagesMatches(img1Data, img2Data, options = {}) {
  await initOpenCv();

  let img1, img2, detector, result1, result2, matcher, matchesVec;
  try {
    const {
      detectorName = 'ORB',
      visualize = false,
      goodMatchesFactor,
      matchFunc = 'BruteForce',
    } = options;
    if (!_.includes(_.keys(AVAILABLE_DETECTORS), detectorName)) {
      throw new Error(
        `'${detectorName}' detector is unknown. ` +
          `Only ${JSON.stringify(_.keys(AVAILABLE_DETECTORS))} detectors are supported.`
      );
    }
    if (!_.includes(_.keys(AVAILABLE_MATCHING_FUNCTIONS), matchFunc)) {
      throw new Error(
        `'${matchFunc}' matching function is unknown. ` +
          `Only ${JSON.stringify(
            _.keys(AVAILABLE_MATCHING_FUNCTIONS)
          )} matching functions are supported.`
      );
    }

    detector = new cv[AVAILABLE_DETECTORS[detectorName]]();
    [img1, img2] = await B.all([cvMatFromImage(img1Data), cvMatFromImage(img2Data)]);
    result1 = detectAndCompute(img1, detector);
    result2 = detectAndCompute(img2, detector);
    matcher = new cv.DescriptorMatcher(AVAILABLE_MATCHING_FUNCTIONS[matchFunc]);
    matchesVec = new cv.DMatchVector();
    let matches = [];
    matcher.match(result1.descriptor, result2.descriptor, matchesVec);
    const totalCount = matchesVec.size();
    if (totalCount < 1) {
      throw new Error(
        `Could not find any matches between images. Double-check orientation, ` +
          `resolution, or use another detector or matching function.`
      );
    }
    for (let i = 0; i < totalCount; i++) {
      matches.push(matchesVec.get(i));
    }

    const hasGoodMatchesFactor =
      _.isFunction(goodMatchesFactor) ||
      (_.isNumber(goodMatchesFactor) && !_.isNaN(goodMatchesFactor));

    if (hasGoodMatchesFactor) {
      if (_.isFunction(goodMatchesFactor)) {
        const distances = matches.map((match) => match.distance);
        const minDistance = _.min(distances);
        const maxDistance = _.max(distances);
        matches = matches.filter((match) =>
          goodMatchesFactor(match.distance, minDistance, maxDistance)
        );
      } else {
        if (matches.length > goodMatchesFactor) {
          matches = matches
            .sort((match1, match2) => match1.distance - match2.distance)
            .slice(0, goodMatchesFactor);
        }
      }
    }

    const extractPoint = (keyPoints, indexPropertyName) => (match) => {
      const {pt, point} = keyPoints.get(match[indexPropertyName]);
      // https://github.com/justadudewhohacks/opencv4nodejs/issues/584
      return pt || point;
    };
    const points1 = matches.map(extractPoint(result1.keyPoints, 'queryIdx'));
    const rect1 = calculateMatchedRect(points1);
    const points2 = matches.map(extractPoint(result2.keyPoints, 'trainIdx'));
    const rect2 = calculateMatchedRect(points2);

    /** @type {MatchingResult} */
    const result = {
      points1,
      rect1,
      points2,
      rect2,
      totalCount,
      count: matches.length,
    };
    if (visualize) {
      const goodMatchesVec = new cv.DMatchVector();
      for (let i = 0; i < matches.length; i++) {
        goodMatchesVec.push_back(matches[i]);
      }
      const visualization = new cv.Mat();
      const color = new cv.Scalar(0, 255, 0, 255);
      cv.drawMatches(
        img1,
        result1.keyPoints,
        img2,
        result2.keyPoints,
        goodMatchesVec,
        visualization,
        color
      );
      highlightRegion(visualization, rect1);
      highlightRegion(visualization, {
        x: img1.cols + rect2.x,
        y: rect2.y,
        width: rect2.width,
        height: rect2.height,
      });
      result.visualization = base64Encode(
        await jimpImgFromCvMat(visualization).getBufferAsync(Jimp.MIME_PNG)
      );
      return result;
    }

    return result;
  } finally {
    try {
      img1.delete();
      img2.delete();
      detector.delete();
      result1?.keyPoints.delete();
      result1?.descriptor.delete();
      result2?.keyPoints.delete();
      result2?.descriptor.delete();
      matcher.delete();
      matchesVec.delete();
    } catch (ign) {}
  }
}

/**
 * @param {Buffer} buf
 * @returns {string}
 */
function base64Encode(buf) {
  return buf.toString('base64');
}

/**
 * Calculates the similarity score between two images.
 * It is expected, that both images have the same resolution.
 *
 * @param {Buffer} img1Data The data of the first image packed into a NodeJS buffer
 * @param {Buffer} img2Data The data of the second image packed into a NodeJS buffer
 * @param {SimilarityOptions} [options] Set of similarity calculation options
 *
 * @returns {Promise<SimilarityResult>} The calculation result
 * @throws {Error} If the given images have different resolution.
 */
async function getImagesSimilarity(
  img1Data,
  img2Data,
  {method = DEFAULT_MATCHING_METHOD, visualize = false} = {}
) {
  await initOpenCv();

  let template, reference, matched;
  try {
    [template, reference] = await B.all([cvMatFromImage(img1Data), cvMatFromImage(img2Data)]);
    if (template.rows !== reference.rows || template.cols !== reference.cols) {
      throw new Error(
        'Both images are expected to have the same size in order to ' +
          'calculate the similarity score.'
      );
    }
    template.convertTo(template, cv.CV_8UC3);
    reference.convertTo(reference, cv.CV_8UC3);

    matched = new cv.Mat();
    cv.matchTemplate(reference, template, matched, toMatchingMethod(method));
    const minMax = cv.minMaxLoc(matched);
    const result = {
      score: minMax.maxVal,
    };

    if (visualize) {
      let bothImages, resultMat, mask, contours, hierarchy;
      try {
        resultMat = new cv.Mat(template.rows, template.cols * 2, cv.CV_8UC3);
        bothImages = new cv.MatVector();
        bothImages.push_back(reference);
        bothImages.push_back(template);
        cv.hconcat(bothImages, resultMat);

        mask = new cv.Mat();
        cv.absdiff(reference, template, mask);
        cv.cvtColor(mask, mask, cv.COLOR_BGR2GRAY, 0);

        cv.threshold(mask, mask, 128, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
        contours = new cv.MatVector();
        hierarchy = new cv.Mat();
        cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        for (let i = 0; i < contours.size(); i++) {
          const boundingRect = cv.boundingRect(contours.get(i));
          highlightRegion(resultMat, boundingRect);
          highlightRegion(resultMat, {
            x: reference.cols + boundingRect.x,
            y: boundingRect.y,
            width: boundingRect.width,
            height: boundingRect.height,
          });
        }
        result.visualization = await jimpImgFromCvMat(resultMat).getBufferAsync(Jimp.MIME_PNG);
      } finally {
        try {
          bothImages.delete();
          resultMat.delete();
          mask.delete();
          contours.delete();
          hierarchy.delete();
        } catch (ign) {}
      }
    }
    if (!_.isEmpty(result.visualization)) {
      result.visualization = result.visualization.toString('base64');
    }
    return result;
  } finally {
    try {
      template.delete();
      reference.delete();
      matched.delete();
    } catch (ign) {}
  }
}

/**
 * Calculates the occurrence position of a partial image in the full
 * image.
 *
 * @template {boolean} [Multiple=false]
 * @param {Buffer} fullImgData The data of the full image packed into a NodeJS buffer
 * @param {Buffer} partialImgData The data of the partial image packed into a NodeJS buffer
 * @param {OccurrenceOptions<Multiple>} [options] Set of occurrence calculation options
 *
 * @returns {Promise<OccurrenceResult>}
 * @throws {Error} If no occurrences of the partial image can be found in the full image
 */
async function getImageOccurrence(fullImgData, partialImgData, options = {}) {
  await initOpenCv();

  const {
    visualize = false,
    threshold = DEFAULT_MATCH_THRESHOLD,
    multiple = false,
    matchNeighbourThreshold = MATCH_NEIGHBOUR_THRESHOLD,
    method = DEFAULT_MATCHING_METHOD,
  } = options;

  let fullImg, partialImg, matched;

  try {
    [fullImg, partialImg] = await B.all([
      cvMatFromImage(fullImgData),
      cvMatFromImage(partialImgData),
    ]);
    matched = new cv.Mat();
    /** @type {OccurrenceResult[]} */
    const results = [];
    let visualization;

    try {
      cv.matchTemplate(fullImg, partialImg, matched, toMatchingMethod(method));
      const minMax = cv.minMaxLoc(matched);

      if (multiple) {
        /** @type {(Point & {score: number})[]} */
        const matches = [];
        for (let row = 0; row < matched.rows; row++) {
          for (let col = 0; col < matched.cols; col++) {
            const score = matched.floatAt(row, col);
            if (score >= threshold) {
              matches.push({score, x: col, y: row});
            }
          }
        }

        const nearMatches = filterNearMatches(matches, matchNeighbourThreshold);

        for (const {x, y, score} of nearMatches) {
          results.push({
            score,
            rect: {
              x,
              y,
              width: partialImg.cols,
              height: partialImg.rows,
            },
          });
        }
      } else if (minMax.maxVal >= threshold) {
        const {x, y} = method.includes('SQDIFF') ? minMax.minLoc : minMax.maxLoc;
        results.push({
          score: minMax.maxVal,
          rect: {
            x,
            y,
            width: partialImg.cols,
            height: partialImg.rows,
          },
        });
      }

      if (_.isEmpty(results)) {
        // Below error message, `Cannot find any occurrences` is referenced in find by image
        throw new Error(
          `Match threshold: ${threshold}. Highest match value ` + `found was ${minMax.maxVal}`
        );
      }
    } catch (e) {
      // Below error message, `Cannot find any occurrences` is referenced in find by image
      throw new Error(
        `Cannot find any occurrences of the partial image in the full image. ` +
          `Original error: ${e.message}`
      );
    }

    if (visualize) {
      const fullHighlightedImage = fullImg.clone();

      for (const result of results) {
        const singleHighlightedImage = fullImg.clone();

        highlightRegion(singleHighlightedImage, result.rect);
        highlightRegion(fullHighlightedImage, result.rect);
        result.visualization = base64Encode(
          await jimpImgFromCvMat(singleHighlightedImage).getBufferAsync(Jimp.MIME_PNG)
        );
      }
      visualization = base64Encode(
        await jimpImgFromCvMat(fullHighlightedImage).getBufferAsync(Jimp.MIME_PNG)
      );
    }
    return {
      rect: results[0].rect,
      score: results[0].score,
      visualization,
      multiple: results,
    };
  } finally {
    try {
      fullImg.delete();
      partialImg.delete();
      matched.delete();
    } catch (ign) {}
  }
}

/**
 * Convert an opencv image matrix into a Jimp image object
 *
 * @param {OpenCVBindings['Mat']} mat the image matrix
 * @return {Jimp} the Jimp image
 */
function jimpImgFromCvMat(mat) {
  return new Jimp({
    width: mat.cols,
    height: mat.rows,
    data: Buffer.from(mat.data),
  });
}

/**
 * Take a binary image buffer and return a cv.Mat
 *
 * @param {Buffer} img the image data buffer
 * @return {Promise<OpenCVBindings['Mat']>} the opencv matrix
 */
async function cvMatFromImage(img) {
  const jimpImg = await Jimp.read(img);
  return cv.matFromImageData(jimpImg.bitmap);
}

/**
 * Filter out match results which have a matched neighbour
 *
 * @template {Point} PointLike
 * @param {PointLike[]} nonZeroMatchResults matrix of image match results
 * @param {number} matchNeighbourThreshold The pixel distance within which we
 * consider an element being a neighbour of an existing match
 * @return {PointLike[]} the filtered array of matched points
 */
function filterNearMatches(nonZeroMatchResults, matchNeighbourThreshold) {
  return nonZeroMatchResults.reduce((acc, element) => {
    if (!acc.some((match) => distance(match, element) <= matchNeighbourThreshold)) {
      acc.push(element);
    }
    return acc;
  }, /** @type {PointLike[]} */ ([]));
}

/**
 * Find the distance between two points
 *
 * @param {Point} point1 The first point
 * @param {Point} point2 The second point
 * @return {number} the distance
 */
function distance(point1, point2) {
  const a2 = Math.pow(point1.x - point2.x, 2);
  const b2 = Math.pow(point1.y - point2.y, 2);
  return Math.sqrt(a2 + b2);
}

export {getImagesMatches, getImagesSimilarity, getImageOccurrence, initOpenCv};

/**
 * @typedef OpenCVBindings
 * @property {any} Mat
 * @property {any} KeyPointVector
 * @property {any} FeatureDetector
 */

/**
 * @typedef SimilarityOptions
 * @property {boolean} [visualize=false] Whether to return the resulting visalization
 * as an image (useful for debugging purposes)
 * @property {string} [method=TM_CCOEFF_NORMED] The name of the template matching method.
 * Acceptable values are:
 * - `TM_CCOEFF`
 * - `TM_CCOEFF_NORMED` (default)
 * - `TM_CCORR`
 * - `TM_CCORR_NORMED`
 * - `TM_SQDIFF`
 * - `TM_SQDIFF_NORMED`
 * Read https://docs.opencv.org/3.0-beta/doc/py_tutorials/py_imgproc/py_template_matching/py_template_matching.html
 * for more details.
 */

/**
 * @typedef SimilarityResult
 * @property {number} score The similarity score as a float number in range [0.0, 1.0].
 * 1.0 is the highest score (means both images are totally equal).
 * @property {Buffer} [visualization] The visualization of the matching result
 * represented as PNG image buffer. This image includes both input pictures where
 * difference regions are highlighted with rectangles.
 */

/**
 * @callback GoodMatchFunction
 * @param {number} current
 * @param {number} minimal
 * @param {number} maximum
 * @returns {boolean}
 */

/**
 * @typedef MatchingOptions
 * @property {string} [detectorName='ORB'] One of possible OpenCV feature detector names
 * from keys of the `AVAILABLE_DETECTORS` object.
 * Some of these methods (FAST, AGAST, GFTT, FAST, SIFT and MSER) are not available
 * in the default OpenCV installation and have to be enabled manually before
 * library compilation.
 * @property {string} [matchFunc='BruteForce'] The name of the matching function.
 * Should be one of the keys of the `AVAILABLE_MATCHING_FUNCTIONS` object.
 * @property {number|GoodMatchFunction} [goodMatchesFactor] The maximum count of "good" matches
 * (e. g. with minimal distances) or a function, which accepts 3 arguments: the current distance,
 * minimal distance, maximum distance and returns true or false to include or exclude the match.
 * @property {boolean} [visualize=false] Whether to return the resulting visalization
 * as an image (useful for debugging purposes)
 */

/**
 * @typedef MatchingResult
 * @property {number} count The count of matched edges on both images.
 * The more matching edges there are no both images the more similar they are.
 * @property {number} [totalCount] The total count of matched edges on both images.
 * It is equal to `count` if `goodMatchesFactor` does not limit the matches,
 * otherwise it contains the total count of matches before `goodMatchesFactor` is
 * applied.
 * @property {string} [visualization] The visualization of the matching result
 * represented as PNG image buffer. This visualization looks like
 * https://user-images.githubusercontent.com/31125521/29702731-c79e3142-8972-11e7-947e-db109d415469.jpg
 * @property {Point[]} [points1] The array of matching points on the first image
 * @property {Rect} [rect1] The bounding rect for the `matchedPoints1` set or a zero rect
 * if not enough matching points are found
 * @property {Point[]} [points2] The array of matching points on the second image
 * @property {Rect} [rect2] The bounding rect for the `matchedPoints2` set or a zero rect
 * if not enough matching points are found
 */

/**
 * @typedef {import('@appium/types').Rect} Rect
 */

/**
 * @template {boolean} Multiple
 * @typedef OccurrenceOptions
 * @property {boolean} [visualize=false] Whether to return the resulting visalization
 * as an image (useful for debugging purposes)
 * @property {number} [threshold=0.5] At what normalized threshold to reject
 * a match
 * @property {Multiple} [multiple=false] find multiple matches in the image
 * @property {number} [matchNeighbourThreshold=10] The pixel distance between matches we consider
 * to be part of the same template match
 * @property {OccurrenceResultMethod} [method='TM_CCOEFF_NORMED']
 */

/**
 * @typedef {'TM_CCOEFF'|'TM_CCOEFF_NORMED'|'TM_CCORR'|'TM_CCORR_NORMED'|'TM_SQDIFF'|'TMSQDIFF_NORMED'} OccurrenceResultMethod
 */

/**
 * @typedef OccurrenceResult
 * @property {Rect} rect The region of the partial image occurence
 * on the full image
 * @property {string} [visualization] The visualization of the matching result
 * represented as PNG image buffer. On this image the matching
 * region is highlighted with a rectangle. If the multiple option is passed,
 * all results are highlighted here.
 * @property {number} score The similarity score as a float number in range [0.0, 1.0].
 * 1.0 is the highest score (means both images are totally equal).
 * @property {OccurrenceResult[]} [multiple] The array of matching OccurenceResults
 * - only when multiple option is passed
 * @property {OccurrenceResultMethod} [method='TM_CCOEFF_NORMED'] The name of the template matching method.
 * Acceptable values are:
 * - TM_CCOEFF
 * - TM_CCOEFF_NORMED (default)
 * - TM_CCORR
 * - TM_CCORR_NORMED
 * - TM_SQDIFF
 * - TM_SQDIFF_NORMED
 * Read https://docs.opencv.org/3.0-beta/doc/py_tutorials/py_imgproc/py_template_matching/py_template_matching.html
 * for more details.
 */

/**
 * @typedef Region
 * @property {number} left - The offset from the left side
 * @property {number} top - The offset from the top
 * @property {number} width - The width
 * @property {number} height - The height
 */

/**
 * @typedef Point
 * @property {number} x - The x coordinate
 * @property {number} y - The y coordinate
 */
