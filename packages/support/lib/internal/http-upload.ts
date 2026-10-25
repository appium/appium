import {createReadStream, openAsBlob, type WriteStream} from 'node:fs';
import path from 'node:path';

import type {HTTPHeaders} from '@appium/types';
import axios, {type AxiosBasicCredentials, type Method, type RawAxiosRequestConfig} from 'axios';
import mimeTypes from 'mime-types';

import {isPlainObject} from './plain-object.js';

export const DEFAULT_TIMEOUT_MS = 4 * 60 * 1000;
export const DEFAULT_FILE_FIELD_NAME = 'file';

export type AuthLike = {user?: string; pass?: string; username?: string; password?: string} | AxiosBasicCredentials;

/** The subset of the public `HttpUploadOptions` which the upload needs */
export interface HttpUploadParams {
  auth?: AuthLike;
  headers?: HTTPHeaders;
  method?: Method;
  timeout?: number;
  fileFieldName?: string;
  formFields?: Record<string, unknown> | [string, unknown][];
}

/** The logger methods used by the upload, passed in by the caller */
export interface HttpLog {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
}

export async function closeStream(stream: WriteStream): Promise<void> {
  if (stream.closed) {
    return;
  }
  await new Promise<void>((resolve) => {
    stream.once('close', () => resolve());
    stream.destroy();
  });
}

export function toAxiosAuth(auth: AuthLike | undefined): AxiosBasicCredentials | null {
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

/** Everything {@linkcode uploadFileToHttp} needs */
export interface HttpUploadRequest {
  localPath: string;
  url: URL;
  options: HttpUploadParams;
  log: HttpLog;
}

/** Uploads the file as a multipart form or a raw request body */
export async function uploadFileToHttp({localPath, url, options, log}: HttpUploadRequest): Promise<void> {
  const {
    method = 'POST',
    timeout = DEFAULT_TIMEOUT_MS,
    headers,
    auth,
    fileFieldName = DEFAULT_FILE_FIELD_NAME,
    formFields,
  } = options;
  const {href} = url;

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
          // Per the WHATWG FormData spec, appending a Blob always produces a *file* part
          // (`filename="blob"`) - unlike the old `form-data` package, which sent a Buffer as
          // a plain field. There is no native FormData API to send raw bytes as a non-file
          // field, so fail loud instead of silently changing the multipart classification.
          throw new TypeError(
            `formFields.${key}: Buffer values are not supported, because native FormData always sends ` +
              `them as file attachments rather than plain fields. Pass a string, or a Blob if a file ` +
              `attachment is actually intended.`,
          );
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
    requestOpts.data = createReadStream(localPath);
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
