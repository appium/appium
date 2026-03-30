import _ from 'lodash';
import log from './logger';
import B from 'bluebird';
import {requireSharp} from './image-util';
import {Writable, type WritableOptions, type Readable} from 'node:stream';
import {requirePackage} from './node';
import axios from 'axios';

/** Constructor for mjpeg-consumer (lazy-loaded) */
type MJpegConsumerConstructor = new () => NodeJS.ReadWriteStream;

let MJpegConsumer: MJpegConsumerConstructor | null = null;

/**
 * @throws {Error} If `mjpeg-consumer` module is not installed or cannot be loaded
 */
async function initMJpegConsumer(): Promise<MJpegConsumerConstructor> {
  if (!MJpegConsumer) {
    try {
      MJpegConsumer = (await requirePackage('mjpeg-consumer')) as MJpegConsumerConstructor;
    } catch {
      throw new Error(
        'mjpeg-consumer module is required to use MJPEG-over-HTTP features. ' +
          'Please install it first (npm i -g mjpeg-consumer) and restart Appium.'
      );
    }
  }
  return MJpegConsumer;
}

const MJPEG_SERVER_TIMEOUT_MS = 10000;

/** Class which stores the last bit of data streamed into it */
export class MJpegStream extends Writable {
  readonly errorHandler: (err: Error) => void;
  readonly url: string;
  /** Number of JPEG frames received so far (reset on {@linkcode clear}). Use stream['updateCount'] in tests if needed. */
  private updateCount = 0;
  /** Last received JPEG chunk (base64 via {@linkcode lastChunkBase64}); `null` when no data yet or after {@linkcode clear}/stop. Use stream['lastChunk'] in tests if needed. */
  private lastChunk: Buffer | null = null;
  private registerStartSuccess: (() => void) | null = null;
  private registerStartFailure: ((err: Error) => void) | null = null;
  private responseStream: Readable | null = null;
  private consumer: NodeJS.ReadWriteStream | null = null;

  /**
   * @param mJpegUrl - URL of MJPEG-over-HTTP stream
   * @param errorHandler - additional function that will be called in the case of any errors
   * @param options - Options to pass to the Writable constructor
   */
  constructor(
    mJpegUrl: string,
    errorHandler: (err: Error) => void = _.noop,
    options: WritableOptions = {}
  ) {
    super(options);
    this.errorHandler = errorHandler;
    this.url = mJpegUrl;
    this.clear();
  }

  get lastChunkBase64(): string | null {
    const lastChunk = this.lastChunk;
    if (lastChunk && !_.isEmpty(lastChunk) && _.isBuffer(lastChunk)) {
      return lastChunk.toString('base64');
    }
    return null;
  }

  async lastChunkPNG(): Promise<Buffer | null> {
    const chunk = this.lastChunk;
    if (!chunk || _.isEmpty(chunk) || !_.isBuffer(chunk)) {
      return null;
    }
    try {
      return await requireSharp()(chunk).png().toBuffer();
    } catch (err: any) {
      log.warn(`Cannot convert MJPEG chunk to PNG: ${err.message}`);
      return null;
    }
  }

  async lastChunkPNGBase64(): Promise<string | null> {
    const png = await this.lastChunkPNG();
    return png ? png.toString('base64') : null;
  }

  clear(): void {
    this.registerStartSuccess = null;
    this.registerStartFailure = null;
    this.responseStream = null;
    this.consumer = null;
    this.lastChunk = null;
    this.updateCount = 0;
  }

  async start(serverTimeout = MJPEG_SERVER_TIMEOUT_MS): Promise<void> {
    this.stop();

    const Consumer = await initMJpegConsumer();
    this.consumer = new Consumer();
    const url = this.url;
    try {
      this.responseStream = (
        await axios({
          url,
          responseType: 'stream',
          timeout: serverTimeout,
        })
      ).data as Readable;
    } catch (e) {
      let message: string;
      if (e && typeof e === 'object' && 'response' in e) {
        message = JSON.stringify((e as {response: unknown}).response);
      } else if (e instanceof Error) {
        message = e.message;
      } else {
        message = String(e);
      }
      throw new Error(
        `Cannot connect to the MJPEG stream at ${url}. Original error: ${message}`
      );
    }

    const onErr = (err: Error) => {
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

    // TODO: replace with native Promises in Appium 4
    const startPromise = new B<void>((res, rej) => {
      this.registerStartSuccess = res;
      this.registerStartFailure = rej;
    }).timeout(
      serverTimeout,
      `Waited ${serverTimeout}ms but the MJPEG server never sent any images`
    );

    (this.responseStream as Readable & {pipe<T extends Writable>(dest: T): T})
      .once('close', onClose)
      .on('error', onErr)
      .pipe(this.consumer as unknown as Writable)
      .pipe(this);

    await startPromise;
  }

  stop(): void {
    if (this.consumer) {
      this.consumer.unpipe(this);
    }
    if (this.responseStream) {
      if (this.consumer) {
        this.responseStream.unpipe(this.consumer);
      }
      this.responseStream.destroy();
    }
    this.clear();
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- Writable.write signature requires encoding and callback */
  /* eslint-disable promise/prefer-await-to-callbacks -- Node Writable.write is callback-based */
  override write(
    data: Buffer | string | Uint8Array,
    encoding?: BufferEncoding | ((error: Error | null) => void),
    callback?: (error: Error | null) => void
  ): boolean {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    /* eslint-enable promise/prefer-await-to-callbacks */
    this.lastChunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
    this.updateCount++;
    if (this.registerStartSuccess) {
      this.registerStartSuccess();
      this.registerStartSuccess = null;
    }
    return true;
  }
}
