import _ from 'lodash';
import log from './logger';
import B from 'bluebird';
import {requireSharp} from './image-util';
import {Writable} from 'stream';
import {requirePackage} from './node';
import axios from 'axios';

// lazy load this, as it might not be available
let MJpegConsumer = null;

/**
 * @throws {Error} If `mjpeg-consumer` module is not installed or cannot be loaded
 */
async function initMJpegConsumer() {
  if (!MJpegConsumer) {
    try {
      MJpegConsumer = await requirePackage('mjpeg-consumer');
    } catch (ign) {}
  }
  if (!MJpegConsumer) {
    throw new Error(
      'mjpeg-consumer module is required to use MJPEG-over-HTTP features. ' +
        'Please install it first (npm i -g mjpeg-consumer) and restart Appium.'
    );
  }
}

// amount of time to wait for the first image in the stream
const MJPEG_SERVER_TIMEOUT_MS = 10000;

/** Class which stores the last bit of data streamed into it */
class MJpegStream extends Writable {
  /**
   * @type {number}
   */
  updateCount = 0;

  /**
   * Create an MJpegStream
   * @param {string} mJpegUrl - URL of MJPEG-over-HTTP stream
   * @param {function} [errorHandler=noop] - additional function that will be
   * called in the case of any errors.
   * @param {object} [options={}] - Options to pass to the Writable constructor
   */
  constructor(mJpegUrl, errorHandler = _.noop, options = {}) {
    super(options);

    this.errorHandler = errorHandler;
    this.url = mJpegUrl;
    this.clear();
  }

  /**
   * Get the base64-encoded version of the JPEG
   *
   * @returns {?string} base64-encoded JPEG image data
   * or `null` if no image can be parsed
   */
  get lastChunkBase64() {
    const lastChunk = /** @type {Buffer} */ (this.lastChunk);
    return !_.isEmpty(this.lastChunk) && _.isBuffer(this.lastChunk)
      ? lastChunk.toString('base64')
      : null;
  }

  /**
   * Get the PNG version of the JPEG buffer
   *
   * @returns {Promise<Buffer?>} PNG image data or `null` if no PNG
   * image can be parsed
   */
  async lastChunkPNG() {
    const lastChunk = /** @type {Buffer} */ (this.lastChunk);
    if (_.isEmpty(lastChunk) || !_.isBuffer(lastChunk)) {
      return null;
    }

    try {
      return await requireSharp()(lastChunk).png().toBuffer();
    } catch (e) {
      return null;
    }
  }

  /**
   * Get the base64-encoded version of the PNG
   *
   * @returns {Promise<string?>} base64-encoded PNG image data
   * or `null` if no image can be parsed
   */
  async lastChunkPNGBase64() {
    const png = await this.lastChunkPNG();
    return png ? png.toString('base64') : null;
  }

  /**
   * Reset internal state
   */
  clear() {
    this.registerStartSuccess = null;
    this.registerStartFailure = null;
    this.responseStream = null;
    this.consumer = null;
    this.lastChunk = null;
    this.updateCount = 0;
  }

  /**
   * Start reading the MJpeg stream and storing the last image
   */
  async start(serverTimeout = MJPEG_SERVER_TIMEOUT_MS) {
    // ensure we're not started already
    this.stop();

    await initMJpegConsumer();

    this.consumer = new MJpegConsumer();

    // use the deferred pattern so we can wait for the start of the stream
    // based on what comes in from an external pipe
    const startPromise = new B((res, rej) => {
      this.registerStartSuccess = res;
      this.registerStartFailure = rej;
    })
      // start a timeout so that if the server does not return data, we don't
      // block forever.
      .timeout(
        serverTimeout,
        `Waited ${serverTimeout}ms but the MJPEG server never sent any images`
      );

    const url = this.url;
    const onErr = (err) => {
      // Make sure we don't get an outdated screenshot if there was an error
      this.lastChunk = null;

      log.error(`Error getting MJpeg screenshot chunk: ${err.message}`);
      this.errorHandler(err);
      if (this.registerStartFailure) {
        this.registerStartFailure(err);
      }
    };
    const onClose = () => {
      log.debug(`The connection to MJPEG server at ${url} has been closed`);
      this.lastChunk = null;
    };

    try {
      this.responseStream = (
        await axios({
          url,
          responseType: 'stream',
          timeout: serverTimeout,
        })
      ).data;
    } catch (e) {
      return onErr(e);
    }

    this.responseStream
      .once('close', onClose)
      .on('error', onErr) // ensure we do something with errors
      .pipe(this.consumer) // allow chunking and transforming of jpeg data
      .pipe(this); // send the actual jpegs to ourself

    await startPromise;
  }

  /**
   * Stop reading the MJpeg stream. Ensure we disconnect all the pipes and stop
   * the HTTP request itself. Then reset the state.
   */
  stop() {
    if (!this.consumer) {
      return;
    }

    this.responseStream.unpipe(this.consumer);
    this.consumer.unpipe(this);
    this.responseStream.destroy();
    this.clear();
  }

  /**
   * Override the Writable write() method in order to save the last image and
   * log the number of images we have received
   * @override
   * @param {Buffer} data - binary data streamed from the MJpeg consumer
   */
  write(data) {
    this.lastChunk = data;
    this.updateCount++;

    if (this.registerStartSuccess) {
      this.registerStartSuccess();
      this.registerStartSuccess = null;
    }

    return true;
  }
}

export {MJpegStream};
