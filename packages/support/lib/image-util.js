let _sharp;

/**
 * @returns {import('sharp')}
 */
export function requireSharp() {
  if (!_sharp) {
    try {
      _sharp = require('sharp');
    } catch (err) {
      throw new Error(
        `Cannot load the 'sharp' module needed for images processing. ` +
        `Consider visiting https://sharp.pixelplumbing.com/install ` +
        `for troubleshooting. Original error: ${err.message}`
      );
    }
  }
  return _sharp;
}

/**
 * Crop the image by given rectangle (use base64 string as input and output)
 *
 * @param {string} base64Image The string with base64 encoded image.
 * Supports all image formats natively supported by Sharp library.
 * @param {import('sharp').Region} rect The selected region of image
 * @return {Promise<string>} base64 encoded string of cropped image
 */
export async function cropBase64Image(base64Image, rect) {
  const buf = await requireSharp()(Buffer.from(base64Image, 'base64')).extract(rect).toBuffer();
  return buf.toString('base64');
}
