import {openAsBlob} from 'node:fs';
import path from 'node:path';

import type {HTTPHeaders} from '@appium/types';
import axios, {type AxiosBasicCredentials, type Method, type RawAxiosRequestConfig} from 'axios';
import mimeTypes from 'mime-types';

import {fs} from './fs.js';
import log from './logger.js';
import {Timer} from './timing.js';
import {isPlainObject, toReadableSizeString} from './util.js';

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

type AuthLike = AuthCredentials | AxiosBasicCredentials;

type HttpRemoteUri = `http://${string}` | `https://${string}`;

/** Uploads the given file to a remote location via HTTP(S). */
export async function uploadFile(
  localPath: string,
  remoteUri: HttpRemoteUri,
  uploadOptions?: HttpUploadOptions,
): Promise<void>;
export async function uploadFile(
  localPath: string,
  remoteUri: string,
  uploadOptions?: HttpUploadOptions,
): Promise<void>;
export async function uploadFile(
  localPath: string,
  remoteUri: string,
  uploadOptions: HttpUploadOptions = {},
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
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `Cannot upload the file at '${localPath}' to '${remoteUri}'. ` +
        `Unsupported remote protocol '${url.protocol}'. ` +
        `Only http/https protocols are supported.`,
    );
  }
  // Matches uploadFileToHttp()'s own default: `undefined` means multipart, and this raw-file-size
  // Content-Length only applies to the non-multipart (explicitly falsy `fileFieldName`) case.
  if (!(uploadOptions.fileFieldName ?? 'file')) {
    uploadOptions.headers = {
      ...(isPlainObject(uploadOptions.headers) ? uploadOptions.headers : {}),
      'Content-Length': size,
    };
  }
  await uploadFileToHttp(localPath, url, uploadOptions);
  if (isMetered) {
    log.info(
      `Uploaded '${localPath}' of ${toReadableSizeString(size)} size in ` +
        `${timer.getDuration().asSeconds.toFixed(3)}s`,
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
  downloadOptions: DownloadOptions = {},
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
  if (isPlainObject(headers)) {
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
    throw new Error(`Cannot download the file from ${remoteUrl}: ${message}`, {cause: err});
  }

  const {size} = await fs.stat(dstPath);
  if (responseLength && size !== responseLength) {
    await fs.rimraf(dstPath);
    throw new Error(
      `The size of the file downloaded from ${remoteUrl} (${size} bytes) ` +
        `differs from the one in Content-Length response header (${responseLength} bytes)`,
    );
  }
  if (isMetered) {
    const secondsElapsed = timer.getDuration().asSeconds;
    log.debug(
      `${remoteUrl} (${toReadableSizeString(size)}) ` +
        `has been downloaded to '${dstPath}' in ${secondsElapsed.toFixed(3)}s`,
    );
    if (secondsElapsed >= 2) {
      const bytesPerSec = Math.floor(size / secondsElapsed);
      log.debug(`Approximate download speed: ${toReadableSizeString(bytesPerSec)}/s`);
    }
  }
}

// #region Private helpers

function toAxiosAuth(auth: AuthLike | undefined): AxiosBasicCredentials | null {
  if (!auth || !isPlainObject(auth)) {
    return null;
  }

  const username = 'username' in auth ? auth.username : auth.user;
  const password = 'password' in auth ? auth.password : auth.pass;
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return null;
  }
  return {username, password};
}

async function uploadFileToHttp(
  localPath: string,
  parsedUri: URL,
  uploadOptions: HttpUploadOptions = {},
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
    // Native FormData/Blob; axios' Node adapter builds the multipart stream itself for any
    // spec-compliant FormData, so the `form-data` package is not needed.
    const form = new FormData();
    if (formFields) {
      let pairs: [string, unknown][] = [];
      if (Array.isArray(formFields)) {
        pairs = formFields as [string, unknown][];
      } else if (isPlainObject(formFields)) {
        pairs = Object.entries(formFields);
      }
      for (const [key, value] of pairs) {
        if (key.toLowerCase() === fileFieldName?.toLowerCase()) {
          continue;
        }
        if (typeof value === 'string' || value instanceof Blob) {
          form.append(key, value);
        } else if (Buffer.isBuffer(value)) {
          form.append(key, new Blob([value]));
        } else {
          form.append(key, String(value));
        }
      }
    }
    // AWS S3 POST upload requires this to be the last field; do not move before formFields.
    const fileName = path.basename(localPath);
    const fileType = mimeTypes.lookup(fileName) || undefined;
    form.append(fileFieldName, await openAsBlob(localPath, {type: fileType}), fileName);
    if (isPlainObject(headers)) {
      requestOpts.headers = headers as RawAxiosRequestConfig['headers'];
    }
    requestOpts.data = form;
  } else {
    if (isPlainObject(headers)) {
      requestOpts.headers = headers;
    }
    // A plain stream, not a Blob: axios force-overwrites a Blob body's `Content-Type` to
    // `data.type || 'application/octet-stream'`, clobbering any caller-supplied header.
    requestOpts.data = fs.createReadStream(localPath);
  }
  log.debug(
    `Performing ${method} to ${href} with options (excluding data): ` +
      JSON.stringify(
        (() => {
          const requestOptsWithoutData = {...requestOpts} as Record<string, unknown>;
          delete requestOptsWithoutData.data;
          return requestOptsWithoutData;
        })(),
      ),
  );

  const {status, statusText} = await axios(requestOpts);
  log.info(`Server response: ${status} ${statusText}`);
}

// #endregion
