import _ from 'lodash';
import {fs} from './fs';
import {toReadableSizeString} from './util';
import log from './logger';
import Ftp from 'jsftp';
import {Timer} from './timing';
import axios, {type AxiosBasicCredentials, type Method, type RawAxiosRequestConfig} from 'axios';
import FormData from 'form-data';
import type {HTTPHeaders} from '@appium/types';

const DEFAULT_TIMEOUT_MS = 4 * 60 * 1000;

/** Common options for {@linkcode uploadFile} and {@linkcode downloadFile}. */
export interface NetOptions {
  /** Whether to log the actual download performance (e.g. timings and speed). Defaults to true. */
  isMetered?: boolean;
  /** Authentication credentials */
  auth?: AuthCredentials;
}

/** Basic auth credentials; used by {@linkcode NetOptions}. */
export interface AuthCredentials {
  /** Non-empty user name (or use `username` for axios-style) */
  user?: string;
  /** Non-empty password (or use `password` for axios-style) */
  pass?: string;
  username?: string;
  password?: string;
}

/** Specific options for {@linkcode downloadFile}. */
export interface DownloadOptions extends NetOptions {
  /** Request timeout in milliseconds; defaults to {@linkcode DEFAULT_TIMEOUT_MS} */
  timeout?: number;
  /** Request headers mapping */
  headers?: Record<string, unknown>;
}

/** Options for {@linkcode uploadFile} when the remote uses the `http(s)` protocol. */
export interface HttpUploadOptions extends NetOptions {
  /** Additional request headers */
  headers?: HTTPHeaders;
  /** HTTP method for file upload. Defaults to 'POST'. */
  method?: Method;
  /** Request timeout in milliseconds; defaults to {@linkcode DEFAULT_TIMEOUT_MS} */
  timeout?: number;
  /**
   * Name of the form field containing the file. Any falsy value uses non-multipart upload.
   * Defaults to 'file'.
   */
  fileFieldName?: string;
  /**
   * Additional form fields. Only considered if `fileFieldName` is set.
   */
  formFields?: Record<string, unknown> | [string, unknown][];
}

/**
 * Options for {@linkcode uploadFile} when the remote uses the `ftp` protocol.
 */
export interface FtpUploadOptions extends NetOptions {}

/** @deprecated Use {@linkcode FtpUploadOptions} instead. */
export type NotHttpUploadOptions = FtpUploadOptions;

/**
 * Uploads the given file to a remote location. HTTP(S) and FTP protocols are supported.
 */
export async function uploadFile(
  localPath: string,
  remoteUri: string,
  uploadOptions: HttpUploadOptions | FtpUploadOptions = {}
): Promise<void> {
  if (!(await fs.exists(localPath))) {
    throw new Error(`'${localPath}' does not exist or is not accessible`);
  }

  const {isMetered = true} = uploadOptions;
  const url = new URL(remoteUri);
  const {size} = await fs.stat(localPath);
  if (isMetered) {
    log.info(`Uploading '${localPath}' of ${toReadableSizeString(size)} size to '${remoteUri}'`);
  }
  const timer = new Timer().start();
  if (isHttpUploadOptions(uploadOptions, url)) {
    if (!uploadOptions.fileFieldName) {
      uploadOptions.headers = {
        ...(_.isPlainObject(uploadOptions.headers) ? uploadOptions.headers : {}),
        'Content-Length': size,
      };
    }
    await uploadFileToHttp(fs.createReadStream(localPath), url, uploadOptions);
  } else if (isFtpUploadOptions(uploadOptions, url)) {
    await uploadFileToFtp(fs.createReadStream(localPath), url, uploadOptions);
  } else {
    throw new Error(
      `Cannot upload the file at '${localPath}' to '${remoteUri}'. ` +
        `Unsupported remote protocol '${url.protocol}'. ` +
        `Only http/https and ftp/ftps protocols are supported.`
    );
  }
  if (isMetered) {
    log.info(
      `Uploaded '${localPath}' of ${toReadableSizeString(size)} size in ` +
        `${timer.getDuration().asSeconds.toFixed(3)}s`
    );
  }
}

/**
 * Downloads the given file via HTTP(S).
 *
 * @throws {Error} If download operation fails
 */
export async function downloadFile(
  remoteUrl: string,
  dstPath: string,
  downloadOptions: DownloadOptions = {}
): Promise<void> {
  const {isMetered = true, auth, timeout = DEFAULT_TIMEOUT_MS, headers} = downloadOptions;

  const requestOpts: RawAxiosRequestConfig = {
    url: remoteUrl,
    responseType: 'stream',
    timeout,
  };
  const axiosAuth = toAxiosAuth(auth);
  if (axiosAuth) {
    requestOpts.auth = axiosAuth;
  }
  if (_.isPlainObject(headers)) {
    requestOpts.headers = headers as RawAxiosRequestConfig['headers'];
  }

  const timer = new Timer().start();
  let responseLength: number;
  try {
    const writer = fs.createWriteStream(dstPath);
    const {data: responseStream, headers: responseHeaders} = await axios(requestOpts);
    responseLength = parseInt(String(responseHeaders['content-length'] ?? '0'), 10);
    (responseStream as NodeJS.ReadableStream).pipe(writer);

    await new Promise<void>((resolve, reject) => {
      (responseStream as NodeJS.ReadableStream).once('error', reject);
      writer.once('finish', () => resolve());
      writer.once('error', (e: Error) => {
        (responseStream as NodeJS.ReadableStream).unpipe(writer);
        reject(e);
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot download the file from ${remoteUrl}: ${message}`);
  }

  const {size} = await fs.stat(dstPath);
  if (responseLength && size !== responseLength) {
    await fs.rimraf(dstPath);
    throw new Error(
      `The size of the file downloaded from ${remoteUrl} (${size} bytes) ` +
        `differs from the one in Content-Length response header (${responseLength} bytes)`
    );
  }
  if (isMetered) {
    const secondsElapsed = timer.getDuration().asSeconds;
    log.debug(
      `${remoteUrl} (${toReadableSizeString(size)}) ` +
        `has been downloaded to '${dstPath}' in ${secondsElapsed.toFixed(3)}s`
    );
    if (secondsElapsed >= 2) {
      const bytesPerSec = Math.floor(size / secondsElapsed);
      log.debug(`Approximate download speed: ${toReadableSizeString(bytesPerSec)}/s`);
    }
  }
}

// #region Private helpers

type AuthLike = AuthCredentials | AxiosBasicCredentials;

function toAxiosAuth(auth: AuthLike | undefined): AxiosBasicCredentials | null {
  if (!auth || !_.isPlainObject(auth)) {
    return null;
  }

  const username = 'username' in auth ? auth.username : auth.user;
  const password = 'password' in auth ? auth.password : auth.pass;
  return username && password ? {username, password} : null;
}

async function uploadFileToHttp(
  localFileStream: NodeJS.ReadableStream,
  parsedUri: URL,
  uploadOptions: HttpUploadOptions = {}
): Promise<void> {
  const {
    method = 'POST',
    timeout = DEFAULT_TIMEOUT_MS,
    headers,
    auth,
    fileFieldName = 'file',
    formFields,
  } = uploadOptions;
  const {href} = parsedUri;

  const requestOpts: RawAxiosRequestConfig = {
    url: href,
    method,
    timeout,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  };
  const axiosAuth = toAxiosAuth(auth);
  if (axiosAuth) {
    requestOpts.auth = axiosAuth;
  }
  if (fileFieldName) {
    const form = new FormData();
    if (formFields) {
      let pairs: [string, unknown][] = [];
      if (_.isArray(formFields)) {
        pairs = formFields as [string, unknown][];
      } else if (_.isPlainObject(formFields)) {
        pairs = _.toPairs(formFields);
      }
      for (const [key, value] of pairs) {
        if (_.toLower(key) !== _.toLower(fileFieldName)) {
          form.append(key, value as string | Buffer);
        }
      }
    }
    // AWS S3 POST upload requires this to be the last field; do not move before formFields.
    form.append(fileFieldName, localFileStream);
    requestOpts.headers = {
      ...(_.isPlainObject(headers) ? headers : {}),
      ...form.getHeaders(),
    };
    requestOpts.data = form;
  } else {
    if (_.isPlainObject(headers)) {
      requestOpts.headers = headers;
    }
    requestOpts.data = localFileStream;
  }
  log.debug(
    `Performing ${method} to ${href} with options (excluding data): ` +
      JSON.stringify(_.omit(requestOpts, ['data']))
  );

  const {status, statusText} = await axios(requestOpts);
  log.info(`Server response: ${status} ${statusText}`);
}

async function uploadFileToFtp(
  localFileStream: string | Buffer | NodeJS.ReadableStream,
  parsedUri: URL,
  uploadOptions: FtpUploadOptions = {}
): Promise<void> {
  const {auth} = uploadOptions;
  const {protocol, hostname, port, pathname} = parsedUri;

  const ftpOpts: {host: string; port: number; user?: string; pass?: string} = {
    host: hostname ?? '',
    port: port !== undefined && port !== '' ? _.parseInt(port, 10) : 21,
  };
  if (auth?.user && auth?.pass) {
    ftpOpts.user = auth.user;
    ftpOpts.pass = auth.pass;
  }
  log.debug(`${protocol.slice(0, -1)} upload options: ${JSON.stringify(ftpOpts)}`);
  return await new Promise<void>((resolve, reject) => {
    new Ftp(ftpOpts).put(localFileStream, pathname, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function isHttpUploadOptions(
  opts: HttpUploadOptions | FtpUploadOptions,
  url: URL
): opts is HttpUploadOptions {
  try {
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Returns true if the URL is FTP, i.e. the options are for FTP upload. */
function isFtpUploadOptions(
  opts: HttpUploadOptions | FtpUploadOptions,
  url: URL
): opts is FtpUploadOptions {
  try {
    return url.protocol === 'ftp:';
  } catch {
    return false;
  }
}

// #endregion
