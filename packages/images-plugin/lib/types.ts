import type {Rect} from '@appium/types';
import type {ImageElementFinder} from './finder';
import type {MatchingResult, OccurrenceResult, SimilarityResult} from '@appium/opencv';
import {
  IMAGE_EL_TAP_STRATEGY_W3C,
  IMAGE_EL_TAP_STRATEGY_MJSONWP,
} from './constants';

/**
 * Image settings interface for device settings
 */
export interface ImageSettings {
  // value between 0 and 1 representing match strength, below which an image
  // element will not be found
  imageMatchThreshold: number;

  // One of possible image matching methods.
  // Read https://docs.opencv.org/3.0-beta/doc/py_tutorials/py_imgproc/py_template_matching/py_template_matching.html
  // for more details.
  // TM_CCOEFF_NORMED by default
  imageMatchMethod: string;

  // if the image returned by getScreenshot differs in size or aspect ratio
  // from the screen, attempt to fix it automatically
  fixImageFindScreenshotDims: boolean;

  // whether Appium should ensure that an image template sent in during image
  // element find should have its size adjusted so the match algorithm will not
  // complain
  fixImageTemplateSize: boolean;

  // whether Appium should ensure that an image template sent in during image
  // element find should have its scale adjusted to display size so the match
  // algorithm will not complain.
  // e.g. iOS has `width=375, height=667` window rect, but its screenshot is
  //      `width=750 × height=1334` pixels. This setting help to adjust the scale
  //      if a user use `width=750 × height=1334` pixels's base template image.
  fixImageTemplateScale: boolean;

  // Users might have scaled template image to reduce their storage size.
  // This setting allows users to scale a template image they send to Appium server
  // so that the Appium server compares the actual scale users originally had.
  // e.g. If a user has an image of 270 x 32 pixels which was originally 1080 x 126 pixels,
  //      the user can set {defaultImageTemplateScale: 4.0} to scale the small image
  //      to the original one so that Appium can compare it as the original one.
  defaultImageTemplateScale: number;

  // whether Appium should re-check that an image element can be matched
  // against the current screenshot before clicking it
  checkForImageElementStaleness: boolean;

  // whether before clicking on an image element Appium should re-determine the
  // position of the element on screen
  autoUpdateImageElementPosition: boolean;

  // which method to use for tapping by coordinate for image elements. the
  // options are 'w3c' or 'mjsonwp'
  imageElementTapStrategy: typeof IMAGE_EL_TAP_STRATEGY_W3C | typeof IMAGE_EL_TAP_STRATEGY_MJSONWP;

  // which method to use to save the matched image area in ImageElement class.
  // It is used for debugging purpose.
  getMatchedImageResult: boolean;
}

/**
 * Options for finding elements by image
 */
export interface FindByImageOptions {
  /** whether this call to find an image is merely to check staleness.
   * If so we can bypass a lot of logic */
  shouldCheckStaleness?: boolean;
  /** Whether we are finding one element or multiple */
  multiple?: boolean;
  /** Whether we ignore defaultImageTemplateScale. It can be used when you would like to
   * scale template with defaultImageTemplateScale setting. */
  ignoreDefaultImageTemplateScale?: boolean;
  /** The bounding rectangle to limit the search in */
  containerRect?: Rect | null;
}

/**
 * Options for creating an ImageElement
 */
export interface ImageElementOpts {
  /** the image which was used to find this ImageElement */
  template: Buffer;
  /** bounds of matched image element */
  rect: Rect;
  /** The similarity score as a float number in range [0.0, 1.0]. 1.0 is the highest
   * score (means both images are totally equal). */
  score: number;
  /** the image which has matched marks. Defaults to null. */
  match?: Buffer | null;
  /** the finder we can use to re-check stale elements */
  finder?: ImageElementFinder | null;
  /** The bounding rectangle to limit the search in */
  containerRect?: Rect | null;
}

/**
 * Dimension interface for width and height
 */
export interface Dimension {
  width: number;
  height: number;
}

/**
 * Position interface for x and y coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Screenshot interface
 */
export interface Screenshot {
  screenshot: Buffer;
}

/**
 * Screenshot scale interface
 */
export interface ScreenshotScale {
  xScale: number;
  yScale: number;
}

/**
 * Image template settings for scaling
 */
export interface ImageTemplateSettings {
  /** fixImageTemplateScale in device-settings */
  fixImageTemplateScale?: boolean;
  /** defaultImageTemplateScale in device-settings */
  defaultImageTemplateScale?: number;
  /** Ignore defaultImageTemplateScale if it has true. If the template
   * has been scaled to defaultImageTemplateScale or should ignore the scale,
   * this parameter should be true. e.g. click in image-element module */
  ignoreDefaultImageTemplateScale?: boolean;
  /** Scale ratio for width */
  xScale?: number;
  /** Scale ratio for height */
  yScale?: number;
}

/**
 * Occurrence result with visualization (string instead of Buffer)
 */
export interface OccurrenceResultWithVisualization {
  rect: Rect;
  score: number;
  visualization?: string | null;
}

/**
 * Interface for results with string visualization instead of Buffer
 */
export interface Visualized {
  visualization?: string | null;
}

/**
 * Matching result with string visualization
 */
export type VisualizedMatchingResult = MatchingResult & Visualized;

/**
 * Occurrence result with string visualization
 */
export type VisualizedOccurrenceResult = OccurrenceResult & Visualized;

/**
 * Similarity result with string visualization
 */
export type VisualizedSimilarityResult = SimilarityResult & Visualized;

/**
 * Result type for image comparison operations
 */
export type ComparisonResult =
  | VisualizedMatchingResult
  | VisualizedOccurrenceResult
  | VisualizedSimilarityResult
  | VisualizedSimilarityResult[];
