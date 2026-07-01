import type {Rect as AppiumRect} from '@appium/types';

export interface Point {
  x: number;
  y: number;
}

export interface Region {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TemplateMatchingMethod =
  | 'TM_CCOEFF'
  | 'TM_CCOEFF_NORMED'
  | 'TM_CCORR'
  | 'TM_CCORR_NORMED'
  | 'TM_SQDIFF'
  | 'TM_SQDIFF_NORMED';

export interface Match {
  score: number;
  x: number;
  y: number;
}

export interface MatchComputationResult {
  descriptor: any;
  keyPoints: any;
}

export type DetectorName = 'AKAZE' | 'AGAST' | 'BRISK' | 'FAST' | 'GFTT' | 'KAZE' | 'MSER' | 'ORB';
export type MatchFuncName =
  | 'FlannBased'
  | 'BruteForce'
  | 'BruteForceL1'
  | 'BruteForceHamming'
  | 'BruteForceHammingLut'
  | 'BruteForceSL2';

export interface MatchingOptions {
  /**
   * One of possible OpenCV feature detector names from keys of the `AVAILABLE_DETECTORS` object.
   * Defaults to `'ORB'`. Some methods (FAST, AGAST, GFTT, SIFT, MSER) are not available in the
   * default OpenCV installation and have to be enabled manually before library compilation.
   */
  detectorName?: DetectorName;
  /**
   * The name of the matching function. Should be one of the keys of the `AVAILABLE_MATCHING_FUNCTIONS` object.
   * Defaults to `'BruteForce'`.
   */
  matchFunc?: MatchFuncName;
  /**
   * The maximum count of "good" matches (e.g. with minimal distances) or a function, which accepts
   * 3 arguments: the current distance, minimal distance, maximum distance and returns true or false
   * to include or exclude the match.
   */
  goodMatchesFactor?: number | ((distance: number, minDistance: number, maxDistance: number) => boolean);
  /**
   * Whether to return the resulting visualization as an image buffer (useful for debugging purposes).
   * Defaults to `false`.
   */
  visualize?: boolean;
}

export interface MatchingResult {
  count: number;
  totalCount: number;
  visualization?: Buffer | null;
  points1: Point[];
  rect1: Rect;
  points2: Point[];
  rect2: Rect;
}

export interface SimilarityOptions {
  /**
   * Whether to return the resulting visualization as an image buffer where difference regions are
   * highlighted with rectangles. Defaults to `false`.
   */
  visualize?: boolean;
  /**
   * The name of the template matching method. Acceptable values are: `TM_CCOEFF`, `TM_CCOEFF_NORMED` (default),
   * `TM_CCORR`, `TM_CCORR_NORMED`, `TM_SQDIFF`, `TM_SQDIFF_NORMED`. Defaults to `'TM_CCOEFF_NORMED'`.
   */
  method?: TemplateMatchingMethod;
}

export interface SimilarityResult {
  score: number;
  visualization?: Buffer | null;
}

export interface OccurrenceOptions {
  /**
   * Whether to return the resulting visualization as an image buffer where the matching region is
   * highlighted with a rectangle. If the multiple option is passed, all results are highlighted.
   * Defaults to `false`.
   */
  visualize?: boolean;
  /**
   * At what normalized threshold to reject a match. Defaults to `0.5`.
   */
  threshold?: number;
  /**
   * Whether to find multiple matches in the image. If `true` or a number, returns all matches above
   * the threshold. Defaults to `false`.
   */
  multiple?: boolean | number;
  /**
   * The pixel distance between matches we consider to be part of the same template match.
   * Defaults to `10`.
   */
  matchNeighbourThreshold?: number;
  /**
   * The name of the template matching method. Acceptable values are: `TM_CCOEFF`, `TM_CCOEFF_NORMED` (default),
   * `TM_CCORR`, `TM_CCORR_NORMED`, `TM_SQDIFF`, `TM_SQDIFF_NORMED`. Defaults to `'TM_CCOEFF_NORMED'`.
   */
  method?: TemplateMatchingMethod;
}

export interface OccurrenceResult {
  rect: AppiumRect;
  visualization?: Buffer | null;
  score: number;
  multiple?: OccurrenceResult[];
}

export interface OpenCVBindings {
  Mat: any;
  KeyPointVector: any;
  FeatureDetector: any;
  Scalar: new (...args: number[]) => any;
  Point: new (x: number, y: number) => any;
  DescriptorMatcher: new (matchFunc: string) => any;
  DMatchVector: new () => any;
  MatVector: new () => any;
  [key: string]: any;
}
