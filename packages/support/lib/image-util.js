import _ from 'lodash';
import Jimp from 'jimp';
import {Buffer} from 'buffer';
import {PNG} from 'pngjs';
import B from 'bluebird';

const BYTES_IN_PIXEL_BLOCK = 4;
const SCANLINE_FILTER_METHOD = 4;
const {MIME_JPEG, MIME_PNG, MIME_BMP} = Jimp;

/**
 * Utility function to get a Jimp image object from buffer or base64 data. Jimp
 * is a great library however it does IO in the constructor so it's not
 * convenient for our async/await model.
 *
 * @param {Buffer|string} data - binary image buffer or base64-encoded image
 * string
 * @returns {Promise<AppiumJimp>} - the jimp image object
 */
async function getJimpImage(data) {
  return await new B((resolve, reject) => {
    if (!_.isString(data) && !Buffer.isBuffer(data)) {
      return reject(new Error('Must initialize jimp object with string or buffer'));
    }

    const truncatedData = _.truncate(
      Buffer.isBuffer(data) ? data.toString('utf8') : data,
      {length: 50}
    );
    new Jimp(
      // if data is a string, assume it is a base64-encoded image
      Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'base64'),
      /**
       * @param {Error?} err
       * @param {AppiumJimp} imgObj
       */
      (err, imgObj) => {
        if (err) {
          err.message = `The argument must be a valid base64-encoded image payload. ` +
            `'${truncatedData}' was passed instead. Original error: ${err.message}`;
          return reject(err);
        }
        if (!imgObj) {
          return reject(new Error('Could not create jimp image from that data'));
        }
        imgObj.getBuffer = B.promisify(imgObj.getBuffer.bind(imgObj), {
          context: imgObj,
        });
        resolve(imgObj);
      }
    );
  });
}

/**
 * Crop the image by given rectangle (use base64 string as input and output)
 *
 * @param {string} base64Image The string with base64 encoded image
 * @param {Region} rect The selected region of image
 * @return {Promise<string>} base64 encoded string of cropped image
 */
async function cropBase64Image(base64Image, rect) {
  const image = await base64ToImage(base64Image);
  cropImage(image, rect);
  return await imageToBase64(image);
}

/**
 * Create a pngjs image from given base64 image
 *
 * @param {string} base64Image The string with base64 encoded image
 * @return {Promise<PNG>} The image object
 */
async function base64ToImage(base64Image) {
  const imageBuffer = Buffer.from(base64Image, 'base64');
  return await new B((resolve, reject) => {
    const image = new PNG({filterType: SCANLINE_FILTER_METHOD});
    image.parse(imageBuffer, (err, image) => {
      // eslint-disable-line promise/prefer-await-to-callbacks
      if (err) {
        return reject(err);
      }
      resolve(image);
    });
  });
}

/**
 * Create a base64 string for given image object
 *
 * @param {PNG} image The image object
 * @return {Promise<string>} The string with base64 encoded image
 */
async function imageToBase64(image) {
  return await new B((resolve, reject) => {
    const chunks = [];
    image
      .pack()
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => {
        resolve(Buffer.concat(chunks).toString('base64'));
      })
      .on('error', (err) => {
        // eslint-disable-line promise/prefer-await-to-callbacks
        reject(err);
      });
  });
}

/**
 * Crop the image by given rectangle
 *
 * @param {PNG} image The image to mutate by cropping
 * @param {Region} rect The selected region of image
 */
function cropImage(image, rect) {
  const imageRect = {width: image.width, height: image.height};
  const interRect = getRectIntersection(rect, imageRect);
  if (interRect.width < rect.width || interRect.height < rect.height) {
    throw new Error(
      `Cannot crop ${JSON.stringify(rect)} from ${JSON.stringify(
        imageRect
      )} because the intersection between them was not the size of the rect`
    );
  }

  const firstVerticalPixel = interRect.top;
  const lastVerticalPixel = interRect.top + interRect.height;

  const firstHorizontalPixel = interRect.left;
  const lastHorizontalPixel = interRect.left + interRect.width;

  const croppedArray = [];
  for (let y = firstVerticalPixel; y < lastVerticalPixel; y++) {
    for (let x = firstHorizontalPixel; x < lastHorizontalPixel; x++) {
      const firstByteIdxInPixelBlock = (imageRect.width * y + x) << 2;
      for (let byteIdx = 0; byteIdx < BYTES_IN_PIXEL_BLOCK; byteIdx++) {
        croppedArray.push(image.data[firstByteIdxInPixelBlock + byteIdx]);
      }
    }
  }

  image.data = Buffer.from(croppedArray);
  image.width = interRect.width;
  image.height = interRect.height;
  return image;
}

function getRectIntersection(rect, imageSize) {
  const left = rect.left >= imageSize.width ? imageSize.width : rect.left;
  const top = rect.top >= imageSize.height ? imageSize.height : rect.top;
  const width = imageSize.width >= left + rect.width ? rect.width : imageSize.width - left;
  const height = imageSize.height >= top + rect.height ? rect.height : imageSize.height - top;
  return {left, top, width, height};
}

export {
  cropBase64Image,
  base64ToImage,
  imageToBase64,
  cropImage,
  getJimpImage,
  MIME_JPEG,
  MIME_PNG,
  MIME_BMP,
};

/**
 * @typedef {Omit<Jimp,'getBuffer'> & {getBuffer: Jimp['getBufferAsync']}} AppiumJimp
 */

/**
 * @typedef Region
 * @property {number} left
 * @property {number} top
 * @property {number} width
 * @property {number} height
 */
