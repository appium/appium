import {node} from 'appium/support';

export const IMAGE_STRATEGY = '-image';

export const IMAGE_ELEMENT_PREFIX = 'appium-image-element-';
export const IMAGE_EL_TAP_STRATEGY_W3C = 'w3cActions';
export const IMAGE_EL_TAP_STRATEGY_MJSONWP = 'touchActions';
export const IMAGE_TAP_STRATEGIES = [IMAGE_EL_TAP_STRATEGY_MJSONWP, IMAGE_EL_TAP_STRATEGY_W3C];
export const DEFAULT_TEMPLATE_IMAGE_SCALE = 1.0;

export const MATCH_FEATURES_MODE = 'matchFeatures';
export const GET_SIMILARITY_MODE = 'getSimilarity';
export const MATCH_TEMPLATE_MODE = 'matchTemplate';

export const DEFAULT_MATCH_THRESHOLD = 0.4;

export const DEFAULT_FIX_IMAGE_TEMPLATE_SCALE = 1;

export const DEFAULT_SETTINGS = node.deepFreeze({
  // value between 0 and 1 representing match strength, below which an image
  // element will not be found
  imageMatchThreshold: DEFAULT_MATCH_THRESHOLD,

  // One of possible image matching methods.
  // Read https://docs.opencv.org/3.0-beta/doc/py_tutorials/py_imgproc/py_template_matching/py_template_matching.html
  // for more details.
  // TM_CCOEFF_NORMED by default
  imageMatchMethod: '',

  // if the image returned by getScreenshot differs in size or aspect ratio
  // from the screen, attempt to fix it automatically
  fixImageFindScreenshotDims: true,

  // whether Appium should ensure that an image template sent in during image
  // element find should have its size adjusted so the match algorithm will not
  // complain
  fixImageTemplateSize: false,

  // whether Appium should ensure that an image template sent in during image
  // element find should have its scale adjusted to display size so the match
  // algorithm will not complain.
  // e.g. iOS has `width=375, height=667` window rect, but its screenshot is
  //      `width=750 × height=1334` pixels. This setting help to adjust the scale
  //      if a user use `width=750 × height=1334` pixels's base template image.
  fixImageTemplateScale: false,

  // Users might have scaled template image to reduce their storage size.
  // This setting allows users to scale a template image they send to Appium server
  // so that the Appium server compares the actual scale users originally had.
  // e.g. If a user has an image of 270 x 32 pixels which was originally 1080 x 126 pixels,
  //      the user can set {defaultImageTemplateScale: 4.0} to scale the small image
  //      to the original one so that Appium can compare it as the original one.
  defaultImageTemplateScale: DEFAULT_TEMPLATE_IMAGE_SCALE,

  // whether Appium should re-check that an image element can be matched
  // against the current screenshot before clicking it
  checkForImageElementStaleness: true,

  // whether before clicking on an image element Appium should re-determine the
  // position of the element on screen
  autoUpdateImageElementPosition: false,

  // which method to use for tapping by coordinate for image elements. the
  // options are 'w3c' or 'mjsonwp'
  imageElementTapStrategy: IMAGE_EL_TAP_STRATEGY_W3C,

  // which method to use to save the matched image area in ImageElement class.
  // It is used for debugging purpose.
  getMatchedImageResult: false,
});
