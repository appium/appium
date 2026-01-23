import _ from 'lodash';
import {Buffer} from 'node:buffer';
import B from 'bluebird';
import sharp from 'sharp';
import {OpenCvAutoreleasePool} from './autorelease-pool';
import type {
  Point,
  Rect,
  Match,
  MatchComputationResult,
  MatchingOptions,
  MatchingResult,
  SimilarityOptions,
  SimilarityResult,
  OccurrenceOptions,
  OccurrenceResult,
  TemplateMatchingMethod,
  OpenCVBindings,
} from './types';

let cv: OpenCVBindings | undefined;

export const DEFAULT_MATCH_THRESHOLD = 0.5;
export const MATCH_NEIGHBOUR_THRESHOLD = 10;

export const AVAILABLE_DETECTORS = {
  AKAZE: 'AKAZE',
  AGAST: 'AgastFeatureDetector',
  BRISK: 'BRISK',
  FAST: 'FastFeatureDetector',
  GFTT: 'GFTTDetector',
  KAZE: 'KAZE',
  MSER: 'MSER',
  ORB: 'ORB',
} as const;

export const AVAILABLE_MATCHING_FUNCTIONS = {
  FlannBased: 'FlannBased',
  BruteForce: 'BruteForce',
  BruteForceL1: 'BruteForce-L1',
  BruteForceHamming: 'BruteForce-Hamming',
  BruteForceHammingLut: 'BruteForce-HammingLUT',
  BruteForceSL2: 'BruteForce-SL2',
} as const;

const MATCHING_METHODS = [
  'TM_CCOEFF',
  'TM_CCOEFF_NORMED',
  'TM_CCORR',
  'TM_CCORR_NORMED',
  'TM_SQDIFF',
  'TM_SQDIFF_NORMED',
] as const;

const DEFAULT_MATCHING_METHOD: TemplateMatchingMethod = 'TM_CCOEFF_NORMED';

// Public exported functions

/**
 * Initializes the OpenCV bindings library.
 * Spins until the opencv-bindings module is fully loaded.
 * You only need to explicitly call this if you want to use your own opencv
 * methods that are not included in this module.
 *
 * @example
 * ```ts
 * import {initOpenCv} from '@appium/opencv';
 * await initOpenCv();
 * ```
 */
export async function initOpenCv(): Promise<void> {
  cv = require('opencv-bindings') as OpenCVBindings;
  while (!cv.getBuildInformation) {
    await B.delay(500);
  }
  // opencv-bindings sets a global unhandledRejection handler of an abort, which we don't want, so
  // undo it here. https://github.com/opencv/opencv/issues/21481
  process.removeAllListeners('unhandledRejection');
}

/**
 * Calculates the count of common edges between two images.
 * The images might be rotated or resized relatively to each other.
 * This method uses feature-based matching which is useful when images are rotated/scaled.
 *
 * Read https://docs.opencv.org/3.0-beta/doc/py_tutorials/py_feature2d/py_matcher/py_matcher.html
 * for more details on feature-based matching.
 *
 * @param img1Data - The data of the first image packed into a NodeJS buffer
 * @param img2Data - The data of the second image packed into a NodeJS buffer
 * @param options - Set of matching options (see {@link MatchingOptions})
 * @returns Matching result containing count, totalCount, points, rects, and optionally visualization
 * @throws {Error} If `detectorName` or `matchFunc` value is unknown, or if no matches can be found between images
 *
 * @example
 * ```ts
 * import {getImagesMatches} from '@appium/opencv';
 * import {fs} from '@appium/support';
 *
 * const image1 = await fs.readFile('image1.jpg');
 * const image2 = await fs.readFile('image2.jpg');
 * const {points1, rect1, points2, rect2, totalCount, count} = await getImagesMatches(image1, image2);
 * ```
 */
export async function getImagesMatches(
  img1Data: Buffer,
  img2Data: Buffer,
  options: MatchingOptions = {}
): Promise<MatchingResult> {
  await initOpenCv();

  if (!cv) {
    throw new Error('OpenCV is not initialized.');
  }

  const pool = new OpenCvAutoreleasePool();
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
          `Only ${JSON.stringify(_.keys(AVAILABLE_MATCHING_FUNCTIONS))} matching functions are supported.`
      );
    }

    const detector = pool.add(new cv[AVAILABLE_DETECTORS[detectorName]]());
    const img1Promise = cvMatFromImage(img1Data);
    const img2Promise = cvMatFromImage(img2Data);
    const [img1Raw, img2Raw] = await B.all([img1Promise, img2Promise]);
    const img1 = pool.add(img1Raw);
    const img2 = pool.add(img2Raw);
    const result1 = detectAndCompute(img1, detector);
    pool.add(result1.keyPoints);
    pool.add(result1.descriptor);
    const result2 = detectAndCompute(img2, detector);
    pool.add(result2.keyPoints);
    pool.add(result2.descriptor);
    const matcher = pool.add(new cv.DescriptorMatcher(AVAILABLE_MATCHING_FUNCTIONS[matchFunc]));
    const matchesVec = pool.add(new cv.DMatchVector());
    matcher.match(result1.descriptor, result2.descriptor, matchesVec);
    const totalCount = matchesVec.size();
    if (totalCount < 1) {
      throw new Error(
        `Could not find any matches between images. Double-check orientation, ` +
          `resolution, or use another detector or matching function.`
      );
    }
    let matches: any[] = [];
    for (let i = 0; i < totalCount; i++) {
      matches.push(matchesVec.get(i));
    }

    const hasGoodMatchesFactor =
      _.isFunction(goodMatchesFactor) ||
      (_.isNumber(goodMatchesFactor) && !_.isNaN(goodMatchesFactor));

    if (hasGoodMatchesFactor) {
      if (_.isFunction(goodMatchesFactor)) {
        const distances = matches.map((match: any) => match.distance);
        const minDistance = _.min(distances);
        const maxDistance = _.max(distances);
        if (minDistance !== undefined && maxDistance !== undefined) {
          matches = matches.filter((match: any) =>
            goodMatchesFactor(match.distance, minDistance, maxDistance)
          );
        }
      } else if (_.isNumber(goodMatchesFactor) && matches.length > goodMatchesFactor) {
        matches = matches
          .sort((match1: any, match2: any) => match1.distance - match2.distance)
          .slice(0, goodMatchesFactor);
      }
    }

    const extractPoint = (keyPoints: any, indexPropertyName: string) => (match: any) => {
      const {pt, point} = keyPoints.get(match[indexPropertyName]);
      // https://github.com/justadudewhohacks/opencv4nodejs/issues/584
      return pt || point;
    };
    const points1 = matches.map(extractPoint(result1.keyPoints, 'queryIdx'));
    const rect1 = calculateMatchedRect(points1);
    const points2 = matches.map(extractPoint(result2.keyPoints, 'trainIdx'));
    const rect2 = calculateMatchedRect(points2);

    const result: MatchingResult = {
      points1,
      rect1,
      points2,
      rect2,
      totalCount,
      count: matches.length,
    };
    if (visualize) {
      const goodMatchesVec = pool.add(new cv.DMatchVector());
      for (const match of matches) {
        goodMatchesVec.push_back(match);
      }
      const visualization = pool.add(new cv.Mat());
      const color = pool.add(new cv.Scalar(0, 255, 0, 255));
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
      result.visualization = await cvMatToPng(visualization);
    }

    return result;
  } finally {
    pool.drain();
  }
}

/**
 * Calculates the similarity score between two images.
 * It is expected that both images have the same resolution.
 * This method uses template matching to compare images pixel-by-pixel.
 *
 * Read https://docs.opencv.org/3.0-beta/doc/py_tutorials/py_imgproc/py_template_matching/py_template_matching.html
 * for more details on template matching.
 *
 * @param img1Data - The data of the first image packed into a NodeJS buffer
 * @param img2Data - The data of the second image packed into a NodeJS buffer
 * @param options - Set of similarity calculation options (see {@link SimilarityOptions})
 * @returns Similarity result containing score (float in range [0.0, 1.0], where 1.0 means images are totally equal) and optionally visualization
 * @throws {Error} If the given images have different resolution
 *
 * @example
 * ```ts
 * import {getImagesSimilarity} from '@appium/opencv';
 * import {fs} from '@appium/support';
 *
 * const image1 = await fs.readFile('image1.jpg');
 * const image2 = await fs.readFile('image2.jpg');
 * const {score} = await getImagesSimilarity(image1, image2);
 * ```
 */
export async function getImagesSimilarity(
  img1Data: Buffer,
  img2Data: Buffer,
  options: SimilarityOptions = {}
): Promise<SimilarityResult> {
  await initOpenCv();

  if (!cv) {
    throw new Error('OpenCV is not initialized.');
  }

  const {method = DEFAULT_MATCHING_METHOD, visualize = false} = options;

  const pool = new OpenCvAutoreleasePool();
  try {
    const templatePromise = cvMatFromImage(img1Data);
    const referencePromise = cvMatFromImage(img2Data);
    const [templateRaw, referenceRaw] = await B.all([templatePromise, referencePromise]);
    const template = pool.add(templateRaw);
    const reference = pool.add(referenceRaw);
    if (template.rows !== reference.rows || template.cols !== reference.cols) {
      throw new Error(
        'Both images are expected to have the same size in order to ' +
          'calculate the similarity score.'
      );
    }
    template.convertTo(template, cv.CV_8UC3);
    reference.convertTo(reference, cv.CV_8UC3);

    const matched = pool.add(new cv.Mat());
    cv.matchTemplate(reference, template, matched, toMatchingMethod(method));
    const minMax = cv.minMaxLoc(matched);
    const result: SimilarityResult = {
      score: minMax.maxVal,
    };

    if (visualize) {
      const resultMat = pool.add(new cv.Mat(template.rows, template.cols * 2, cv.CV_8UC3));
      const bothImages = pool.add(new cv.MatVector());
      bothImages.push_back(reference);
      bothImages.push_back(template);
      cv.hconcat(bothImages, resultMat);

      const mask = pool.add(new cv.Mat());
      cv.absdiff(reference, template, mask);
      cv.cvtColor(mask, mask, cv.COLOR_BGR2GRAY, 0);

      cv.threshold(mask, mask, 128, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
      const contours = pool.add(new cv.MatVector());
      const hierarchy = pool.add(new cv.Mat());
      cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      for (let i = 0; i < contours.size(); i++) {
        const boundingRect = pool.add(cv.boundingRect(contours.get(i)));
        highlightRegion(resultMat, boundingRect);
        highlightRegion(resultMat, {
          x: reference.cols + boundingRect.x,
          y: boundingRect.y,
          width: boundingRect.width,
          height: boundingRect.height,
        });
      }
      result.visualization = await cvMatToPng(resultMat);
    }
    return result;
  } finally {
    pool.drain();
  }
}

/**
 * Calculates the occurrence position of a partial image in the full image.
 * This method uses template matching to find where the partial image appears in the full image.
 *
 * Read https://docs.opencv.org/3.0-beta/doc/py_tutorials/py_imgproc/py_template_matching/py_template_matching.html
 * for more details on template matching.
 *
 * @param fullImgData - The data of the full image packed into a NodeJS buffer
 * @param partialImgData - The data of the partial image packed into a NodeJS buffer
 * @param options - Set of occurrence calculation options (see {@link OccurrenceOptions})
 * @returns Occurrence result containing rect (region of the partial image occurrence on the full image), score (similarity score as float in range [0.0, 1.0]), optionally visualization, and optionally multiple (array of matching results when multiple option is enabled)
 * @throws {Error} If no occurrences of the partial image can be found in the full image
 *
 * @example
 * ```ts
 * import {getImageOccurrence} from '@appium/opencv';
 * import {fs} from '@appium/support';
 *
 * const fullImage = await fs.readFile('full-image.jpg');
 * const partialImage = await fs.readFile('partial-image.jpg');
 * const {rect, score} = await getImageOccurrence(fullImage, partialImage);
 * ```
 */
export async function getImageOccurrence(
  fullImgData: Buffer,
  partialImgData: Buffer,
  options: OccurrenceOptions = {}
): Promise<OccurrenceResult> {
  await initOpenCv();

  if (!cv) {
    throw new Error('OpenCV is not initialized.');
  }

  const {
    visualize = false,
    threshold = DEFAULT_MATCH_THRESHOLD,
    multiple = false,
    matchNeighbourThreshold = MATCH_NEIGHBOUR_THRESHOLD,
    method = DEFAULT_MATCHING_METHOD,
  } = options;

  const pool = new OpenCvAutoreleasePool();
  try {
    const fullImgPromise = cvMatFromImage(fullImgData);
    const partialImgPromise = cvMatFromImage(partialImgData);
    const [fullImgRaw, partialImgRaw] = await B.all([fullImgPromise, partialImgPromise]);
    const fullImg = pool.add(fullImgRaw);
    const partialImg = pool.add(partialImgRaw);
    const matched = pool.add(new cv.Mat());
    const results: Array<{score: number; rect: Rect; visualization?: Buffer}> = [];
    let visualization: Buffer | null = null;

    try {
      cv.matchTemplate(fullImg, partialImg, matched, toMatchingMethod(method));
      const minMax = cv.minMaxLoc(matched);

      if (multiple) {
        const matches: Match[] = [];
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
          `Match threshold: ${threshold}. Highest match value found was ${minMax.maxVal}`
        );
      }
    } catch (e: any) {
      // Below error message, `Cannot find any occurrences` is referenced in find by image
      throw new Error(
        `Cannot find any occurrences of the partial image in the full image. ` +
          `Original error: ${e?.message || String(e)}`
      );
    }

    if (visualize) {
      const fullHighlightedImage = pool.add(fullImg.clone());

      const visualizePromises: Promise<Buffer>[] = [];
      for (const result of results) {
        const singleHighlightedImage = pool.add(fullImg.clone());

        highlightRegion(singleHighlightedImage, result.rect);
        highlightRegion(fullHighlightedImage, result.rect);
        visualizePromises.push(cvMatToPng(singleHighlightedImage));
      }
      let restPngBuffers: Buffer[] = [];
      [visualization, ...restPngBuffers] = await B.all([
        cvMatToPng(fullHighlightedImage),
        ...visualizePromises,
      ]);
      for (const [result, pngBuffer] of _.zip(results, restPngBuffers)) {
        if (result && pngBuffer) {
          result.visualization = pngBuffer;
        }
      }
    }
    return {
      rect: results[0].rect,
      score: results[0].score,
      visualization,
      multiple: results,
    };
  } finally {
    pool.drain();
  }
}

// Private helper functions

function toMatchingMethod(name: string): number {
  if (!MATCHING_METHODS.includes(name as TemplateMatchingMethod)) {
    throw new Error(
      `The matching method '${name}' is unknown. ` +
        `Only the following matching methods are supported: ${MATCHING_METHODS}`
    );
  }
  if (!cv) {
    throw new Error('OpenCV is not initialized. Call initOpenCv() first.');
  }
  return cv[name];
}

function detectAndCompute(img: any, detector: any): MatchComputationResult {
  if (!cv) {
    throw new Error('OpenCV is not initialized. Call initOpenCv() first.');
  }
  const keyPoints = new cv.KeyPointVector();
  const descriptor = new cv.Mat();
  detector.detect(img, keyPoints);
  detector.compute(img, keyPoints, descriptor);
  return {
    keyPoints,
    descriptor,
  };
}

function calculateMatchedRect(matchedPoints: Point[]): Rect {
  if (matchedPoints.length < 2) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  const pointsSortedByDistance = matchedPoints
    .map((point) => [Math.sqrt(point.x * point.x + point.y * point.y), point] as [number, Point])
    .sort((pair1, pair2) => pair1[0] - pair2[0])
    .map((pair) => pair[1]);
  const firstPoint = _.head(pointsSortedByDistance);
  const lastPoint = _.last(pointsSortedByDistance);
  if (!firstPoint || !lastPoint) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }
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

function highlightRegion(mat: any, region: Rect): any {
  if (region.width <= 0 || region.height <= 0) {
    return mat;
  }

  if (!cv) {
    throw new Error('OpenCV is not initialized. Call initOpenCv() first.');
  }

  const pool = new OpenCvAutoreleasePool();
  try {
    // highlight in red
    const color = pool.add(new cv.Scalar(255, 0, 0, 255));
    const thickness = 2;
    const topLeft = pool.add(new cv.Point(region.x, region.y));
    const botRight = pool.add(new cv.Point(region.x + region.width, region.y + region.height));
    cv.rectangle(mat, topLeft, botRight, color, thickness, cv.LINE_8, 0);
    return mat;
  } finally {
    pool.drain();
  }
}

async function cvMatToPng(mat: any): Promise<Buffer> {
  return await sharp(Buffer.from(mat.data), {
    raw: {
      width: mat.cols,
      height: mat.rows,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

async function cvMatFromImage(img: Buffer): Promise<any> {
  if (!cv) {
    throw new Error('OpenCV is not initialized. Call initOpenCv() first.');
  }
  const {data, info} = await sharp(img)
    .ensureAlpha()
    .raw()
    .toBuffer({resolveWithObject: true});
  const {width, height} = info;
  return cv.matFromImageData({data, width, height});
}

function filterNearMatches(nonZeroMatchResults: Match[], matchNeighbourThreshold: number): Match[] {
  return nonZeroMatchResults.reduce((acc: Match[], element: Match) => {
    if (!acc.some((match) => distance(match, element) <= matchNeighbourThreshold)) {
      acc.push(element);
    }
    return acc;
  }, []);
}

function distance(point1: Point, point2: Point): number {
  const a2 = Math.pow(point1.x - point2.x, 2);
  const b2 = Math.pow(point1.y - point2.y, 2);
  return Math.sqrt(a2 + b2);
}

// Re-export types for consumers
export type {
  MatchingOptions,
  MatchingResult,
  SimilarityOptions,
  SimilarityResult,
  OccurrenceOptions,
  OccurrenceResult,
};
