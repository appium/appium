import _ from 'lodash';
import { errors } from 'appium/driver';
import { fs, util } from 'appium/support';
import { MODULE_ROOT } from './utils';
import path from 'path';

export const IMAGES_ROOT = path.resolve(MODULE_ROOT, 'images');
// https://github.com/naptha/tesseract.js/blob/1ebde35b3b52f2f5643b6442c624542011f75395/docs/image-format.md
const SINGATUES_MAP = Object.freeze({
  bmp: [0, [0x42, 0x4D]],
  jpg: [0, [0xFF, 0xD8, 0xFF]],
  png: [0, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  pbm: [0, [0x50, 0x31]],
  webp: [8, [0x57, 0x45, 0x42, 0x50]],
});

/**
 * Recognizes known file types from their payload
 *
 * @param {Buffer} buf Image payload
 * @returns {string?} File extension string if it is known, otherwise null
 */
function fileExtFromBuffer (buf) {
  for (const [ext, [offset, magic]] of _.toPairs(SINGATUES_MAP)) {
    if (buf.length < offset + magic.length) {
      continue;
    }
    if (_.isEqual(Array.from(buf.subarray(offset, magic.length)), magic)) {
      return ext;
    }
  }
  return null;
}

/**
 * Verifies the actual image payload and stores it into a temporary file.
 *
 * @param {string} b64payload Base64-encoded image payload
 * @returns {Promise<string>} Full path to the temporary image file
 * @throws {errors.InvalidArgumentError} If the provided image payload is either invalid or unsupported.
 */
export async function prepareImage (root, b64payload) {
  const imgBuffer = Buffer.from(b64payload, 'base64');
  const fileExt = fileExtFromBuffer(imgBuffer);
  if (!fileExt) {
    throw new errors.InvalidArgumentError(
      `The given image payload '${_.truncate(b64payload)}' has not been recognized. ` +
      `Only the following image formats are supported: ${_.keys(SINGATUES_MAP)}.`
    );
  }
  const resultPath = path.join(root, `${util.uuidV4()}.${fileExt}`);
  try {
    await fs.writeFile(resultPath, imgBuffer);
  } catch (e) {
    throw new Error(
      `The folder '${root}' must be writeable in order to proceed. Original error: ${e.message}`
    );
  }
  return resultPath;
}
