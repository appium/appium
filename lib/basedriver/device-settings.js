import _ from 'lodash';
import log from './logger';
import { DEFAULT_MATCH_THRESHOLD } from './commands/images';
import { IMAGE_EL_TAP_STRATEGY_W3C, DEFAULT_TEMPLATE_IMAGE_SCALE } from './image-element';

const GLOBAL_DEFAULT_SETTINGS = {
  // value between 0 and 1 representing match strength, below which an image
  // element will not be found
  imageMatchThreshold: DEFAULT_MATCH_THRESHOLD,

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
};

// declare settings that are really handled only by basedriver, so downstream
// drivers can choose to ignore them for their own settings validation, etc...
const BASEDRIVER_HANDLED_SETTINGS = [
  'imageMatchThreshold',
  'fixImageFindScreenshotDims',
  'fixImageTemplateSize',
  'fixImageTemplateScale',
  'defaultImageTemplateScale',
  'checkForImageElementStaleness',
  'autoUpdateImageElementPosition',
  'imageElementTapStrategy',
  'getMatchedImageResult',
];

class DeviceSettings {

  constructor (defaultSettings = {}, onSettingsUpdate = null) {
    this._settings = Object.assign({}, GLOBAL_DEFAULT_SETTINGS, defaultSettings);
    this.onSettingsUpdate = onSettingsUpdate;
  }

  // calls updateSettings from implementing driver every time a setting is changed.
  async update (newSettings) {
    if (!_.isObject(newSettings)) {
      throw new Error('Settings update should be called with valid JSON');
    }
    for (let prop of _.keys(newSettings)) {
      if (_.isUndefined(this._settings[prop])) {
        log.warn(`Didn't know about setting '${prop}'. Are you sure you ` +
                 `spelled it correctly? Proceeding anyway. Valid settings: ${_.keys(this._settings)}`);
      }
      if (this._settings[prop] !== newSettings[prop]) {
        // update setting only when there is updateSettings defined.
        if (this.onSettingsUpdate) {
          await this.onSettingsUpdate(prop, newSettings[prop], this._settings[prop]);
          this._settings[prop] = newSettings[prop];
        } else {
          log.errorAndThrow('Unable to update settings; onSettingsUpdate method not found');
        }
      }
    }
  }

  getSettings () {
    return this._settings;
  }
}

export default DeviceSettings;
export { DeviceSettings, BASEDRIVER_HANDLED_SETTINGS };
