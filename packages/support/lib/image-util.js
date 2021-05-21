import _ from 'lodash';
import Jimp from 'jimp';
import { Buffer } from 'buffer';
import { PNG } from 'pngjs';
import B from 'bluebird';
import { hasValue } from './util';
import log from './logger';
import { requirePackage } from './node';


const { MIME_JPEG, MIME_PNG, MIME_BMP } = Jimp;
let cv = null;

/**
 * @typedef {Object} Region
 * @property {number} left - The offset from the left side
 * @property {number} top - The offset from the top
 * @property {number} width - The width
 * @property {number} height - The height
 */

/**
 * @typedef {Object} Point
 * @property {number} x - The x coordinate
 * @property {number} y - The y coordinate
 */

/**
 * @typedef {Object} Rect
 * @property {number} x - The top left coordinate
 * @property {number} y - The bottom right coordinate
 * @property {number} width - The width
 * @property {number} height - The height
 */

const BYTES_IN_PIXEL_BLOCK = 4;
const SCANLINE_FILTER_METHOD = 4;
const DEFAULT_MATCH_THRESHOLD = 0.5;
const MATCH_NEIGHBOUR_THRESHOLD = 10;

const AVAILABLE_DETECTORS = [
  'AKAZE',
  'AGAST',
  'BRISK',
  'FAST',
  'GFTT',
  'KAZE',
  'MSER',
  'SIFT',
  'ORB',
];

const AVAILABLE_MATCHING_FUNCTIONS = [
  'FlannBased',
  'BruteForce',
  'BruteForceL1',
  'BruteForceHamming',
  'BruteForceHammingLut',
  'BruteForceSL2',
];

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
function toMatchingMethod (name) {
  if (!MATCHING_METHODS.includes(name)) {
    throw new Error(`The matching method '${name}' is unknown. ` +
      `Only the following matching methods are supported: ${MATCHING_METHODS}`);
  }
  return cv[name];
}

/**
 * Utility function to get a Jimp image object from buffer or base64 data. Jimp
 * is a great library however it does IO in the constructor so it's not
 * convenient for our async/await model.
 *
 * @param {Buffer|string} data - binary image buffer or base64-encoded image
 * string
 * @returns {Jimp} - the jimp image object
 */
async function getJimpImage (data) {
  return await new B((resolve, reject) => {
    if (!_.isString(data) && !_.isBuffer(data)) {
      return reject(new Error('Must initialize jimp object with string or buffer'));
    }
    // if data is a string, assume it is a base64-encoded image
    if (_.isString(data)) {
      data = Buffer.from(data, 'base64');
    }
    new Jimp(data, (err, imgObj) => {
      if (err) {
        return reject(err);
      }
      if (!imgObj) {
        return reject(new Error('Could not create jimp image from that data'));
      }
      imgObj._getBuffer = imgObj.getBuffer.bind(imgObj);
      imgObj.getBuffer = B.promisify(imgObj._getBuffer, {context: imgObj});
      resolve(imgObj);
    });
  });
}

/**
 * @throws {Error} If opencv4nodejs module is not installed or cannot be loaded
 */
async function initOpenCV () {
  if (cv) {
    return;
  }

  log.debug(`Initializing opencv`);
  try {
    cv = await requirePackage('opencv4nodejs');
  } catch (err) {
    log.warn(`Unable to load 'opencv4nodejs': ${err.message}`);
  }

  if (!cv) {
    throw new Error(`'opencv4nodejs' module is required to use OpenCV features. ` +
                    `Please install it first ('npm i -g opencv4nodejs') and restart Appium. ` +
                    'Read https://github.com/justadudewhohacks/opencv4nodejs#how-to-install for more details on this topic.');
  }
}

/**
 * @typedef {Object} MatchComputationResult
 * @property {cv.DescriptorMatch} desciptor - OpenCV match descriptor
 * @property {Array<cv.KeyPoint>} keyPoints - The array of key points
 */

/**
 * Calculates an OpenCV match descriptor of an image, which can be used
 * for brute-force matching.
 * Read https://docs.opencv.org/3.0-beta/doc/py_tutorials/py_feature2d/py_matcher/py_matcher.html
 * for more details.
 *
 * @param {cv.Mat} img Image data
 * @param {cv.FeatureDetector} detector OpenCV feature detector instance
 *
 * @returns {MatchComputationResult}
 */
async function detectAndCompute (img, detector) {
  const keyPoints = await detector.detectAsync(img);
  const descriptor = await detector.computeAsync(img, keyPoints);
  return {
    keyPoints,
    descriptor
  };
}

/**
 * Calculated the bounding rect coordinates for the array of matching points
 *
 * @param {Array<Point>} matchedPoints Array of matching points
 * @returns {Rect} The matching bounding rect or a zero rect if no match
 * can be found.
 */
function calculateMatchedRect (matchedPoints) {
  if (matchedPoints.length < 2) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
  }

  const pointsSortedByDistance = matchedPoints
    .map((point) => [Math.sqrt(point.x * point.x + point.y * point.y), point])
    .sort((pair1, pair2) => pair1[0] >= pair2[0])
    .map((pair) => pair[1]);
  const firstPoint = _.head(pointsSortedByDistance);
  const lastPoint = _.last(pointsSortedByDistance);
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
    height: bottomRightPoint.y - topLeftPoint.y
  };
}

/**
 * Draws a rectanngle on the given image matrix
 *
 * @param {cv.Mat} mat The source image
 * @param {Rect} region The region to highlight
 *
 * @returns {cv.Mat} The same image with the rectangle on it
 */
function highlightRegion (mat, region) {
  if (region.width <= 0 || region.height <= 0) {
    return;
  }

  // highlight in red
  const color = new cv.Vec(0, 0, 255);
  const thickness = 2;
  mat.drawRectangle(new cv.Rect(region.x, region.y, region.width, region.height), color, thickness, cv.LINE_8);
  return mat;
}

/**
 * @typedef {Object} MatchingOptions
 * @property {?string} detectorName ['ORB'] One of possible OpenCV feature detector names
 * from `AVAILABLE_DETECTORS` array.
 * Some of these methods (FAST, AGAST, GFTT, FAST, SIFT and MSER) are not available
 * in the default OpenCV installation and have to be enabled manually before
 * library compilation.
 * @property {?string} matchFunc ['BruteForce'] The name of the matching function.
 * Should be one of `AVAILABLE_MATCHING_FUNCTIONS` array.
 * @property {?number|Function} goodMatchesFactor The maximum count of "good" matches
 * (e. g. with minimal distances) or a function, which accepts 3 arguments: the current distance,
 * minimal distance, maximum distance and returns true or false to include or exclude the match.
 * @property {?boolean} visualize [false] Whether to return the resulting visalization
 * as an image (useful for debugging purposes)
 */

/**
 * @typedef {Object} MatchingResult
 * @property {number} count The count of matched edges on both images.
 * The more matching edges there are no both images the more similar they are.
 * @property {number} totalCount The total count of matched edges on both images.
 * It is equal to `count` if `goodMatchesFactor` does not limit the matches,
 * otherwise it contains the total count of matches before `goodMatchesFactor` is
 * applied.
 * @property {?Buffer} visualization The visualization of the matching result
 * represented as PNG image buffer. This visualization looks like
 * https://user-images.githubusercontent.com/31125521/29702731-c79e3142-8972-11e7-947e-db109d415469.jpg
 * @property {Array<Point>} points1 The array of matching points on the first image
 * @property {Rect} rect1 The bounding rect for the `matchedPoints1` set or a zero rect
 * if not enough matching points are found
 * @property {Array<Point>} points2 The array of matching points on the second image
 * @property {Rect} rect2 The bounding rect for the `matchedPoints2` set or a zero rect
 * if not enough matching points are found
 */

/**
 * Calculates the count of common edges between two images.
 * The images might be rotated or resized relatively to each other.
 *
 * @param {Buffer} img1Data The data of the first image packed into a NodeJS buffer
 * @param {Buffer} img2Data The data of the second image packed into a NodeJS buffer
 * @param {?MatchingOptions} options [{}] Set of matching options
 *
 * @returns {MatchingResult} Maching result
 * @throws {Error} If `detectorName` value is unknown.
 */
async function getImagesMatches (img1Data, img2Data, options = {}) {
  await initOpenCV();

  const {detectorName = 'ORB', visualize = false,
         goodMatchesFactor, matchFunc = 'BruteForce'} = options;
  if (!_.includes(AVAILABLE_DETECTORS, detectorName)) {
    throw new Error(`'${detectorName}' detector is unknown. ` +
                    `Only ${JSON.stringify(AVAILABLE_DETECTORS)} detectors are supported.`);
  }
  if (!_.includes(AVAILABLE_MATCHING_FUNCTIONS, matchFunc)) {
    throw new Error(`'${matchFunc}' matching function is unknown. ` +
                    `Only ${JSON.stringify(AVAILABLE_MATCHING_FUNCTIONS)} matching functions are supported.`);
  }

  const detector = new cv[`${detectorName}Detector`]();
  const [img1, img2] = await B.all([
    cv.imdecodeAsync(img1Data),
    cv.imdecodeAsync(img2Data)
  ]);
  const [result1, result2] = await B.all([
    detectAndCompute(img1, detector),
    detectAndCompute(img2, detector)
  ]);
  let matches = [];
  try {
    matches = await cv[`match${matchFunc}Async`](result1.descriptor, result2.descriptor);
  } catch (e) {
    throw new Error(`Cannot find any matches between the given images. Try another detection algorithm. ` +
                    ` Original error: ${e}`);
  }
  const totalCount = matches.length;
  if (hasValue(goodMatchesFactor)) {
    if (_.isFunction(goodMatchesFactor)) {
      const distances = matches.map((match) => match.distance);
      const minDistance = _.min(distances);
      const maxDistance = _.max(distances);
      matches = matches
        .filter((match) => goodMatchesFactor(match.distance, minDistance, maxDistance));
    } else {
      if (matches.length > goodMatchesFactor) {
        matches = matches
          .sort((match1, match2) => match1.distance - match2.distance)
          .slice(0, goodMatchesFactor);
      }
    }
  }

  const extractPoint = (keyPoints, indexPropertyName) => (match) => {
    const {pt, point} = keyPoints[match[indexPropertyName]];
    // https://github.com/justadudewhohacks/opencv4nodejs/issues/584
    return (pt || point);
  };
  const points1 = matches.map(extractPoint(result1.keyPoints, 'queryIdx'));
  const rect1 = calculateMatchedRect(points1);
  const points2 = matches.map(extractPoint(result2.keyPoints, 'trainIdx'));
  const rect2 = calculateMatchedRect(points2);

  const result = {
    points1,
    rect1,
    points2,
    rect2,
    totalCount,
    count: matches.length,
  };
  if (visualize) {
    const visualization = cv.drawMatches(img1, img2, result1.keyPoints, result2.keyPoints, matches);
    highlightRegion(visualization, rect1);
    highlightRegion(visualization, {
      x: img1.cols + rect2.x,
      y: rect2.y,
      width: rect2.width,
      height: rect2.height
    });
    result.visualization = await cv.imencodeAsync('.png', visualization);
  }
  return result;
}

/**
 * @typedef {Object} SimilarityOptions
 * @property {?boolean} visualize [false] Whether to return the resulting visalization
 * as an image (useful for debugging purposes)
 * @property {string} method [TM_CCOEFF_NORMED] The name of the template matching method.
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
 * @typedef {Object} SimilarityResult
 * @property {number} score The similarity score as a float number in range [0.0, 1.0].
 * 1.0 is the highest score (means both images are totally equal).
 * @property {?Buffer} visualization The visualization of the matching result
 * represented as PNG image buffer. This image includes both input pictures where
 * difference regions are highlighted with rectangles.
 */

/**
 * Calculates the similarity score between two images.
 * It is expected, that both images have the same resolution.
 *
 * @param {Buffer} img1Data The data of the first image packed into a NodeJS buffer
 * @param {Buffer} img2Data The data of the second image packed into a NodeJS buffer
 * @param {?SimilarityOptions} options [{}] Set of similarity calculation options
 *
 * @returns {SimilarityResult} The calculation result
 * @throws {Error} If the given images have different resolution.
 */
async function getImagesSimilarity (img1Data, img2Data, options = {}) {
  await initOpenCV();

  const {
    method = DEFAULT_MATCHING_METHOD,
    visualize = false,
  } = options;
  let [template, reference] = await B.all([
    cv.imdecodeAsync(img1Data),
    cv.imdecodeAsync(img2Data)
  ]);
  if (template.rows !== reference.rows || template.cols !== reference.cols) {
    throw new Error('Both images are expected to have the same size in order to ' +
                    'calculate the similarity score.');
  }
  [template, reference] = await B.all([
    template.convertToAsync(cv.CV_8UC3),
    reference.convertToAsync(cv.CV_8UC3)
  ]);

  let matched;
  try {
    matched = await reference.matchTemplateAsync(template, toMatchingMethod(method));
  } catch (e) {
    throw new Error(`The reference image did not match to the template one. Original error: ${e.message}`);
  }
  const minMax = await matched.minMaxLocAsync();
  const result = {
    score: minMax.maxVal
  };
  if (visualize) {
    const resultMat = new cv.Mat(template.rows, template.cols * 2, cv.CV_8UC3);
    await B.all([
      reference.copyToAsync(
        resultMat.getRegion(new cv.Rect(0, 0, reference.cols, reference.rows))),
      template.copyToAsync(
        resultMat.getRegion(new cv.Rect(reference.cols, 0, template.cols, template.rows)))
    ]);
    let mask = reference.absdiff(template);
    mask = await mask.cvtColorAsync(cv.COLOR_BGR2GRAY);
    let contours = [];
    try {
      mask = await mask.thresholdAsync(128, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
      contours = await mask.findContoursAsync(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    } catch (ign) {
      // No contours can be found, which means, most likely, that images are equal
    }
    for (const contour of contours) {
      const boundingRect = contour.boundingRect();
      highlightRegion(resultMat, boundingRect);
      highlightRegion(resultMat, {
        x: reference.cols + boundingRect.x,
        y: boundingRect.y,
        width: boundingRect.width,
        height: boundingRect.height
      });
    }
    result.visualization = await cv.imencodeAsync('.png', resultMat);
  }
  return result;
}

/**
 * @typedef {Object} OccurrenceOptions
 * @property {?boolean} visualize [false] Whether to return the resulting visalization
 * as an image (useful for debugging purposes)
 * @property {?float} threshold [0.5] At what normalized threshold to reject
 * a match
 * @property {?float} multiple [false] find multiple matches in the image
 * @property {?number} matchNeighbourThreshold [10] The pixel distance between matches we consider
 * to be part of the same template match
 */

/**
 * @typedef {Object} OccurrenceResult
 * @property {Rect} rect The region of the partial image occurence
 * on the full image
 * @property {?Buffer} visualization The visualization of the matching result
 * represented as PNG image buffer. On this image the matching
 * region is highlighted with a rectangle. If the multiple option is passed,
 * all results are highlighted here.
 * @property {number} score The similarity score as a float number in range [0.0, 1.0].
 * 1.0 is the highest score (means both images are totally equal).
 * @property {Array<OccurrenceResult>} multiple The array of matching OccurenceResults
 * - only when multiple option is passed
 * @property {string} method [TM_CCOEFF_NORMED] The name of the template matching method.
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
 * Calculates the occurrence position of a partial image in the full
 * image.
 *
 * @param {Buffer} fullImgData The data of the full image packed into a NodeJS buffer
 * @param {Buffer} partialImgData The data of the partial image packed into a NodeJS buffer
 * @param {?OccurrenceOptions} options [{}] Set of occurrence calculation options
 *
 * @returns {OccurrenceResult}
 * @throws {Error} If no occurrences of the partial image can be found in the full image
 */
async function getImageOccurrence (fullImgData, partialImgData, options = {}) {
  await initOpenCV();

  const {
    visualize = false,
    threshold = DEFAULT_MATCH_THRESHOLD,
    multiple = false,
    matchNeighbourThreshold = MATCH_NEIGHBOUR_THRESHOLD,
    method = DEFAULT_MATCHING_METHOD,
  } = options;

  const [fullImg, partialImg] = await B.all([
    cv.imdecodeAsync(fullImgData),
    cv.imdecodeAsync(partialImgData)
  ]);
  const results = [];
  let visualization = null;

  try {
    const matched = await fullImg.matchTemplateAsync(partialImg, toMatchingMethod(method));
    const minMax = await matched.minMaxLocAsync();

    if (multiple) {
      const nonZeroMatchResults = matched.threshold(threshold, 1, cv.THRESH_BINARY)
        .convertTo(cv.CV_8U)
        .findNonZero();
      const matches = filterNearMatches(nonZeroMatchResults, matchNeighbourThreshold);

      for (const {x, y} of matches) {
        results.push({
          score: matched.at(y, x),
          rect: {
            x, y,
            width: partialImg.cols,
            height: partialImg.rows
          }
        });
      }
    } else if (minMax.maxVal >= threshold) {
      const {x, y} = method.includes('SQDIFF') ? minMax.minLoc : minMax.maxLoc;
      results.push({
        score: minMax.maxVal,
        rect: {
          x, y,
          width: partialImg.cols,
          height: partialImg.rows
        }
      });
    }

    if (_.isEmpty(results)) {
      // Below error message, `Cannot find any occurrences` is referenced in find by image
      throw new Error(`Match threshold: ${threshold}. Highest match value ` +
                      `found was ${minMax.maxVal}`);
    }
  } catch (e) {
    // Below error message, `Cannot find any occurrences` is referenced in find by image
    throw new Error(`Cannot find any occurrences of the partial image in the full image. ` +
      `Original error: ${e.message}`);
  }

  if (visualize) {
    const fullHighlightedImage = fullImg.copy();

    for (const result of results) {
      const singleHighlightedImage = fullImg.copy();

      highlightRegion(singleHighlightedImage, result.rect);
      highlightRegion(fullHighlightedImage, result.rect);
      result.visualization = await cv.imencodeAsync('.png', singleHighlightedImage);
    }
    visualization = await cv.imencodeAsync('.png', fullHighlightedImage);
  }

  return {
    rect: results[0].rect,
    score: results[0].score,
    visualization,
    multiple: results
  };
}

/**
 * Filter out match results which have a matched neighbour
 *
 * @param {Array<Point>} nonZeroMatchResults matrix of image match results
 * @param {number} matchNeighbourThreshold The pixel distance within which we
 * consider an element being a neighbour of an existing match
 * @return {Array<Point>} the filtered array of matched points
 */
function filterNearMatches (nonZeroMatchResults, matchNeighbourThreshold) {
  return nonZeroMatchResults.reduce((acc, element) => {
    if (!acc.some((match) => distance(match, element) <= matchNeighbourThreshold)) {
      acc.push(element);
    }
    return acc;
  }, []);
}

/**
 * Find the distance between two points
 *
 * @param {Point} point1 The first point
 * @param {Point} point2 The second point
 * @return {number} the distance
 */
function distance (point1, point2) {
  const a2 = Math.pow((point1.x - point2.x), 2);
  const b2 = Math.pow((point1.y - point2.y), 2);
  return Math.sqrt(a2 + b2);
}

/**
 * Crop the image by given rectangle (use base64 string as input and output)
 *
 * @param {string} base64Image The string with base64 encoded image
 * @param {Region} rect The selected region of image
 * @return {string} base64 encoded string of cropped image
 */
async function cropBase64Image (base64Image, rect) {
  const image = await base64ToImage(base64Image);
  cropImage(image, rect);
  return await imageToBase64(image);
}

/**
 * Create a pngjs image from given base64 image
 *
 * @param {string} base64Image The string with base64 encoded image
 * @return {PNG} The image object
 */
async function base64ToImage (base64Image) {
  const imageBuffer = Buffer.from(base64Image, 'base64');
  return await new B((resolve, reject) => {
    const image = new PNG({filterType: SCANLINE_FILTER_METHOD});
    image.parse(imageBuffer, (err, image) => { // eslint-disable-line promise/prefer-await-to-callbacks
      if (err) {
        return reject(err);
      }
      resolve(image);
    });
  });
}

/**
 * Create a base64 string for given image object
 *
 * @param {PNG} image The image object
 * @return {string} The string with base64 encoded image
 */
async function imageToBase64 (image) {
  return await new B((resolve, reject) => {
    const chunks = [];
    image.pack()
    .on('data', (chunk) => chunks.push(chunk)).on('end', () => {
      resolve(Buffer.concat(chunks).toString('base64'));
    })
    .on('error', (err) => { // eslint-disable-line promise/prefer-await-to-callbacks
      reject(err);
    });
  });
}

/**
 * Crop the image by given rectangle
 *
 * @param {PNG} image The image to mutate by cropping
 * @param {Region} rect The selected region of image
 */
function cropImage (image, rect) {
  const imageRect = {width: image.width, height: image.height};
  const interRect = getRectIntersection(rect, imageRect);
  if (interRect.width < rect.width || interRect.height < rect.height) {
    throw new Error(`Cannot crop ${JSON.stringify(rect)} from ${JSON.stringify(imageRect)} because the intersection between them was not the size of the rect`);
  }

  const firstVerticalPixel = interRect.top;
  const lastVerticalPixel = interRect.top + interRect.height;

  const firstHorizontalPixel = interRect.left;
  const lastHorizontalPixel = interRect.left + interRect.width;

  const croppedArray = [];
  for (let y = firstVerticalPixel; y < lastVerticalPixel; y++) {
    for (let x = firstHorizontalPixel; x < lastHorizontalPixel; x++) {
      const firstByteIdxInPixelBlock = (imageRect.width * y + x) << 2;
      for (let byteIdx = 0; byteIdx < BYTES_IN_PIXEL_BLOCK; byteIdx++) {
        croppedArray.push(image.data[firstByteIdxInPixelBlock + byteIdx]);
      }
    }
  }

  image.data = Buffer.from(croppedArray);
  image.width = interRect.width;
  image.height = interRect.height;
  return image;
}

function getRectIntersection (rect, imageSize) {
  const left = rect.left >= imageSize.width ? imageSize.width : rect.left;
  const top = rect.top >= imageSize.height ? imageSize.height : rect.top;
  const width = imageSize.width >= (left + rect.width) ? rect.width : (imageSize.width - left);
  const height = imageSize.height >= (top + rect.height) ? rect.height : (imageSize.height - top);
  return {left, top, width, height};
}

export {
  cropBase64Image, base64ToImage, imageToBase64, cropImage, getImagesMatches,
  getImagesSimilarity, getImageOccurrence, getJimpImage, MIME_JPEG, MIME_PNG,
  MIME_BMP,
};
