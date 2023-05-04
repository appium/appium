import sharp from 'sharp';

/**
 * Crop the image by given rectangle (use base64 string as input and output)
 *
 * @param {string} base64Image The string with base64 encoded image.
 * Supports all image formats natively supported by Sharp library.
 * @param {sharp.Region} rect The selected region of image
 * @return {Promise<string>} base64 encoded string of cropped image
 */
export async function cropBase64Image(base64Image, rect) {
  const buf = await sharp(Buffer.from(base64Image, 'base64')).extract(rect).toBuffer();
  return buf.toString('base64');
}
