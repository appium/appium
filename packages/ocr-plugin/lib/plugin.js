import _ from 'lodash';
import BasePlugin from 'appium/plugin';
import { createWorker } from 'tesseract.js';
import { DEFAULT_LANG, requireLanguages, LANGS_ROOT } from './languages';
import { IMAGES_ROOT, prepareImage } from './image';
import B from 'bluebird';
import { fs } from 'appium/support';

export default class OcrPlugin extends BasePlugin {
  constructor(pluginName = 'OcrPlugin') {
    super(pluginName);
  }

  static newMethodMap = /** @type {const} */ ({
    '/session/:sessionId/appium/perform_ocr': {
      POST: {
        command: 'performOcr',
        payloadParams: {
          required: ['image'],
          optional: ['options'],
        },
        neverProxy: true,
      },
    },
  });

  /**
   * @typedef {Object} OCROptions
   * @property {string} languages [eng] One or more "+"-separated language names to recognize
   * on the given image. Make sure you have downloaded the corresponding .traineddata.gz
   * file for each language going to be recognized (only `eng` one is present by default).
   * The plugin looks for language .traineddata.gz or .traineddata files under `langsRoot` folder.
   * Language names should correspond to existing .traineddata.gz file names.
   * @property {string} imagesRoot [<moduleRoot>/images] The full path to the folder
   * where temporary images are supposed to be stored. The folder must be writeable.
   * @property {string} langsRoot [<moduleRoot>/languages] The full path to the folder
   * where .traineddata or .traineddata.gz files are located. Files for other languages could
   * be downloaded from https://github.com/naptha/tessdata
   * @property {import('tesseract.js').Rectangle} rectangle If provided then OCR is only going
   * to be applied to this particular area of the provided image.
   * @property {import('tesseract.js').WorkerParams} parameters
   * @property {import('tesseract.js').OEM} oem OCR Engine Mode. Check
   * https://github.com/naptha/tesseract.js/blob/master/src/constants/OEM.js
   * for more details on available values.
   * @property {boolean} verbose [false] Whether to append verbose tesseract.js logs
   * into plugin logs.
   */

  /**
   * @typedef {Object} OCRResult
   * @property {import('tesseract.js').Page} page
   */

  /**
   * Performs Optical Characters Recognition on the given image payload.
   * The recognition is based on https://github.com/naptha/tesseract.js
   *
   * @param {() => any} next
   * @param {import('appium/driver').BaseDriver} driver
   * @param {string} image Base-64 encoded image payload
   * @param {OCROptions?} options
   * @returns {Promise<OCRResult>}
   * @throws {Error} if there was an error while perofrming OCR
   */
  async performOcr(next, driver, image, options) {
    const {
      languages = DEFAULT_LANG,
      imagesRoot = IMAGES_ROOT,
      langsRoot = LANGS_ROOT,
      rectangle,
      parameters,
      oem,
      verbose,
    } = options ?? {};
    await requireLanguages(langsRoot, languages);
    const workerArgs = {
      langPath: langsRoot,
      cachePath: langsRoot,
      errorHandler: (errMsg) => { this.logger.error(errMsg); },
    };
    if (verbose) {
      workerArgs.logger = (line) => {
        this.logger.debug(_.isPlainObject(line) ? JSON.stringify(line) : line);
      };
    }
    const worker = createWorker(workerArgs);
    const tmpImagePromise = prepareImage(imagesRoot, image);
    let tmpImagePath = null;
    try {
      await worker.load();
      await worker.loadLanguage(languages);
      await worker.initialize(languages, oem);
      if (_.isPlainObject(parameters)) {
        await worker.setParameters(parameters);
      }
      tmpImagePath = await tmpImagePromise;
      const { data } = await worker.recognize(tmpImagePath, {rectangle});
      return {page: data};
    } finally {
      if (!tmpImagePath) {
        try {
          tmpImagePath = await tmpImagePromise;
        } catch (ign) {}
      }
      await B.all([
        worker.terminate(),
        tmpImagePath ? fs.rimraf(tmpImagePath) : B.resolve(),
      ]);
    }
  }
}

export { OcrPlugin };
