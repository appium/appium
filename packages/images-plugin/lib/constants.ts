import {node} from 'appium/support';
import type {ImageSettings} from './types';

export const IMAGE_STRATEGY = '-image';

export const IMAGE_ELEMENT_PREFIX = 'appium-image-element-';
export const IMAGE_EL_TAP_STRATEGY_W3C = 'w3cActions';
export const IMAGE_EL_TAP_STRATEGY_MJSONWP = 'touchActions';
export const IMAGE_TAP_STRATEGIES = [IMAGE_EL_TAP_STRATEGY_MJSONWP, IMAGE_EL_TAP_STRATEGY_W3C] as const;
export const DEFAULT_TEMPLATE_IMAGE_SCALE = 1.0;

export const MATCH_FEATURES_MODE = 'matchFeatures';
export const GET_SIMILARITY_MODE = 'getSimilarity';
export const MATCH_TEMPLATE_MODE = 'matchTemplate';

export const DEFAULT_MATCH_THRESHOLD = 0.4;

export const DEFAULT_FIX_IMAGE_TEMPLATE_SCALE = 1;

export const DEFAULT_SETTINGS = node.deepFreeze({
  imageMatchThreshold: DEFAULT_MATCH_THRESHOLD,
  imageMatchMethod: '',
  fixImageFindScreenshotDims: true,
  fixImageTemplateSize: false,
  fixImageTemplateScale: false,
  defaultImageTemplateScale: DEFAULT_TEMPLATE_IMAGE_SCALE,
  checkForImageElementStaleness: true,
  autoUpdateImageElementPosition: false,
  imageElementTapStrategy: IMAGE_EL_TAP_STRATEGY_W3C,
  getMatchedImageResult: false,
}) as ImageSettings;
