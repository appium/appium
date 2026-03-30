import type sharp from 'sharp';

let _sharp: typeof sharp | undefined;

/**
 * @returns The sharp module for image processing
 */
export function requireSharp(): typeof sharp {
  if (!_sharp) {
    try {
      _sharp = require('sharp') as typeof sharp;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Cannot load the 'sharp' module needed for images processing. ` +
          `Consider visiting https://sharp.pixelplumbing.com/install ` +
          `for troubleshooting. Original error: ${message}`
      );
    }
  }
  return _sharp;
}

/**
 * Crop the image by given rectangle (use base64 string as input and output)
 *
 * @param base64Image The string with base64 encoded image.
 * Supports all image formats natively supported by Sharp library.
 * @param rect The selected region of image
 * @returns base64 encoded string of cropped image
 */
export async function cropBase64Image(
  base64Image: string,
  rect: sharp.Region
): Promise<string> {
  const buf = await requireSharp()(Buffer.from(base64Image, 'base64'))
    .extract(rect)
    .toBuffer();
  return buf.toString('base64');
}
