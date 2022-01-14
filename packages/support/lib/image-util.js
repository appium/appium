import _ from 'lodash';
import Jimp from 'jimp';
import { Buffer } from 'buffer';
import { PNG } from 'pngjs';
import B from 'bluebird';
import { hasValue } from './util';
import log from './logger';


let cv;
const { MIME_JPEG, MIME_PNG, MIME_BMP } = Jimp;

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
 * Spins until the opencv-bindings module is fully loaded
 */
async function initOpenCv () {
  cv = require('opencv-bindings');
  let waited = false;
  while (!cv.getBuildInformation) {
    log.info(`OpenCV module not fully loaded, waiting...`);
    await B.delay(500);
    waited = true;
  }
  // opencv-bindings sets a global unhandledRejection handler of an abort, which we don't want, so
  // undo it here. https://github.com/opencv/opencv/issues/21481
  process.removeAllListeners('unhandledRejection');
  if (waited) {
    log.info(`OpenCV module successfully loaded`);
  }
}


/**
 * @typedef {Object} MatchComputationResult
 * @property {cv.DescriptorMatch} descriptor - OpenCV match descriptor
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
function detectAndCompute (img, detector) {
  const keyPoints = new cv.KeyPointVector();
  const descriptor = new cv.Mat();
  detector.detect(img, keyPoints);
  detector.compute(img, keyPoints, descriptor);
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
  const color = new cv.Scalar(255, 0, 0, 255);
  const thickness = 2;
  const topLeft = new cv.Point(region.x, region.y);
  const botRight = new cv.Point(region.x + region.width, region.y + region.height);
  cv.rectangle(mat, topLeft, botRight, color, thickness, cv.LINE_8, 0);
  return mat;
}

/**
 * @typedef {Object} MatchingOptions
 * @property {?string} detectorName ['ORB'] One of possible OpenCV feature detector names
 * from keys of the `AVAILABLE_DETECTORS` object.
 * Some of these methods (FAST, AGAST, GFTT, FAST, SIFT and MSER) are not available
 * in the default OpenCV installation and have to be enabled manually before
 * library compilation.
 * @property {?string} matchFunc ['BruteForce'] The name of the matching function.
 * Should be one of the keys of the `AVAILABLE_MATCHING_FUNCTIONS` object.
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
  await initOpenCv();

  let img1, img2, detector, result1, result2, matcher, matchesVec;
  try {
    const {detectorName = 'ORB', visualize = false,
           goodMatchesFactor, matchFunc = 'BruteForce'} = options;
    if (!_.includes(_.keys(AVAILABLE_DETECTORS), detectorName)) {
      throw new Error(`'${detectorName}' detector is unknown. ` +
                      `Only ${JSON.stringify(_.keys(AVAILABLE_DETECTORS))} detectors are supported.`);
    }
    if (!_.includes(_.keys(AVAILABLE_MATCHING_FUNCTIONS), matchFunc)) {
      throw new Error(`'${matchFunc}' matching function is unknown. ` +
                      `Only ${JSON.stringify(_.keys(AVAILABLE_MATCHING_FUNCTIONS))} matching functions are supported.`);
    }

    detector = new cv[AVAILABLE_DETECTORS[detectorName]]();
    ([img1, img2] = await B.all([
      cvMatFromImage(img1Data),
      cvMatFromImage(img2Data)
    ]));
    result1 = detectAndCompute(img1, detector);
    result2 = detectAndCompute(img2, detector);
    matcher = new cv.DescriptorMatcher(AVAILABLE_MATCHING_FUNCTIONS[matchFunc]);
    matchesVec = new cv.DMatchVector();
    let matches = [];
    matcher.match(result1.descriptor, result2.descriptor, matchesVec);
    const totalCount = matchesVec.size();
    if (totalCount < 1) {
      throw new Error(`Could not find any matches between images. Double-check orientation, ` +
                      `resolution, or use another detector or matching function.`);
    }
    for (let i = 0; i < totalCount; i++) {
      matches.push(matchesVec.get(i));
    }
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
      const {pt, point} = keyPoints.get(match[indexPropertyName]);
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
      const goodMatchesVec = new cv.DMatchVector();
      for (let i = 0; i < matches.length; i++) {
        goodMatchesVec.push_back(matches[i]);
      }
      const visualization = new cv.Mat();
      const color = new cv.Scalar(0, 255, 0, 255);
      cv.drawMatches(img1, result1.keyPoints, img2, result2.keyPoints, goodMatchesVec, visualization, color);
      highlightRegion(visualization, rect1);
      highlightRegion(visualization, {
        x: img1.cols + rect2.x,
        y: rect2.y,
        width: rect2.width,
        height: rect2.height
      });
      result.visualization = await jimpImgFromCvMat(visualization).getBufferAsync(Jimp.MIME_PNG);
    }

    return result;
  } finally {
    try {
      img1.delete(); img2.delete(); detector.delete(); result1.keyPoints.delete(); result1.descriptor.delete();
      result2.keyPoints.delete(); result2.descriptor.delete(); matcher.delete(); matchesVec.delete();
    } catch (ign) {}
  }
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
  await initOpenCv();

  const {
    method = DEFAULT_MATCHING_METHOD,
    visualize = false,
  } = options;

  let template, reference, matched;
  try {
    ([template, reference] = await B.all([
      cvMatFromImage(img1Data),
      cvMatFromImage(img2Data)
    ]));
    if (template.rows !== reference.rows || template.cols !== reference.cols) {
      throw new Error('Both images are expected to have the same size in order to ' +
                      'calculate the similarity score.');
    }
    template.convertTo(template, cv.CV_8UC3);
    reference.convertTo(reference, cv.CV_8UC3);

    matched = new cv.Mat();
    cv.matchTemplate(reference, template, matched, toMatchingMethod(method));
    const minMax = cv.minMaxLoc(matched);
    const result = {
      score: minMax.maxVal
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
            height: boundingRect.height
          });
        }
        result.visualization = await jimpImgFromCvMat(resultMat).getBufferAsync(Jimp.MIME_PNG);
      } finally {
        try {
          bothImages.delete(); resultMat.delete(); mask.delete(); contours.delete(); hierarchy.delete();
        } catch (ign) {}
      }
    }
    return result;
  } finally {
    try {
      template.delete(); reference.delete(); matched.delete();
    } catch (ign) {}
  }
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
    ([fullImg, partialImg] = await B.all([
      cvMatFromImage(fullImgData),
      cvMatFromImage(partialImgData)
    ]));
    matched = new cv.Mat();
    const results = [];
    let visualization = null;

    try {
      cv.matchTemplate(fullImg, partialImg, matched, toMatchingMethod(method));
      const minMax = cv.minMaxLoc(matched);

      if (multiple) {
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
      const fullHighlightedImage = fullImg.clone();

      for (const result of results) {
        const singleHighlightedImage = fullImg.clone();

        highlightRegion(singleHighlightedImage, result.rect);
        highlightRegion(fullHighlightedImage, result.rect);
        result.visualization = await jimpImgFromCvMat(singleHighlightedImage).getBufferAsync(Jimp.MIME_PNG);
      }
      visualization = await jimpImgFromCvMat(fullHighlightedImage).getBufferAsync(Jimp.MIME_PNG);
    }
    return {
      rect: results[0].rect,
      score: results[0].score,
      visualization,
      multiple: results
    };
  } finally {
    try {
      fullImg.delete(); partialImg.delete(); matched.delete();
    } catch (ign) {}
  }
}

function jimpImgFromCvMat (mat) {
  return new Jimp({
    width: mat.cols,
    height: mat.rows,
    data: Buffer.from(mat.data)
  });
}

async function cvMatFromImage (img) {
  const jimpImg = await Jimp.read(img);
  return cv.matFromImageData(jimpImg.bitmap);
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
  MIME_BMP
};
