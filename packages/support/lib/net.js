import _ from 'lodash';
import fs from './fs';
import url from 'url';
import B from 'bluebird';
import { toReadableSizeString } from './util';
import log from './logger';
import Ftp from 'jsftp';
import Timer from './timing';
import axios from 'axios';
import FormData from 'form-data';


function toAxiosAuth (auth) {
  if (!_.isPlainObject(auth)) {
    return null;
  }

  const axiosAuth = {
    username: auth.username || auth.user,
    password: auth.password || auth.pass,
  };
  return (axiosAuth.username && axiosAuth.password) ? axiosAuth : null;
}

async function uploadFileToHttp (localFileStream, parsedUri, uploadOptions = {}) {
  const {
    method = 'POST',
    timeout = 5000,
    headers,
    auth,
    fileFieldName = 'file',
    formFields,
  } = uploadOptions;
  const { href } = parsedUri;

  const requestOpts = {
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
    form.append(fileFieldName, localFileStream);
    if (formFields) {
      let pairs = [];
      if (_.isArray(formFields)) {
        pairs = formFields;
      } else if (_.isPlainObject(formFields)) {
        pairs = _.toPairs(formFields);
      }
      for (const [key, value] of pairs) {
        if (_.toLower(key) !== _.toLower(fileFieldName)) {
          form.append(key, value);
        }
      }
    }
    requestOpts.headers = Object.assign({}, _.isPlainObject(headers) ? headers : {},
      form.getHeaders());
    requestOpts.data = form;
  } else {
    if (_.isPlainObject(headers)) {
      requestOpts.headers = headers;
    }
    requestOpts.data = localFileStream;
  }
  log.debug(`Performing ${method} to ${href} with options (excluding data): ` +
    JSON.stringify(_.omit(requestOpts, ['data'])));

  const {status, statusText} = await axios(requestOpts);
  log.info(`Server response: ${status} ${statusText}`);
}

async function uploadFileToFtp (localFileStream, parsedUri, uploadOptions = {}) {
  const {
    auth,
    user,
    pass,
  } = uploadOptions;
  const {
    hostname,
    port,
    protocol,
    pathname,
  } = parsedUri;

  const ftpOpts = {
    host: hostname,
    port: port || 21,
  };
  if ((auth?.user && auth?.pass) || (user && pass)) {
    ftpOpts.user = auth?.user || user;
    ftpOpts.pass = auth?.pass || pass;
  }
  log.debug(`${protocol} upload options: ${JSON.stringify(ftpOpts)}`);
  return await new B((resolve, reject) => {
    new Ftp(ftpOpts).put(localFileStream, pathname, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * @typedef {Object} AuthCredentials
 * @property {string} user - Non-empty user name
 * @property {string} pass - Non-empty password
 */

/**
 * @typedef {Object} FtpUploadOptions
 * @property {boolean} isMetered [true] - Whether to log the actual upload performance
 * (e.g. timings and speed)
 * @property {AuthCredentials} auth
 */

/**
 * @typedef {Object} HttpUploadOptions
 * @property {boolean} isMetered [true] - Whether to log the actual upload performance
 * (e.g. timings and speed)
 * @property {string} method [POST] - The HTTP method used for file upload
 * @property {AuthCredentials} auth
 * @property {number} timeout [5000] - The actual request timeout in milliseconds
 * @property {Object} headers - Additional request headers mapping
 * @property {?string} fileFieldName [file] - The name of the form field containing the file
 * content to be uploaded. Any falsy value make the request to use non-multipart upload
 * @property {Array<Pair>|Object} formFields - The additional form fields
 * to be included into the upload request. This property is only considered if
 * `fileFieldName` is set
 */

/**
 * Uploads the given file to a remote location. HTTP(S) and FTP
 * protocols are supported.
 *
 * @param {string} localPath - The path to a file on the local storage.
 * @param {string} remoteUri - The remote URI to upload the file to.
 * @param {?FtpUploadOptions|HttpUploadOptions} uploadOptions
 */
async function uploadFile (localPath, remoteUri, uploadOptions = {}) {
  if (!await fs.exists(localPath)) {
    throw new Error (`'${localPath}' does not exists or is not accessible`);
  }

  const {
    isMetered = true,
  } = uploadOptions;

  const parsedUri = url.parse(remoteUri);
  const {size} = await fs.stat(localPath);
  if (isMetered) {
    log.info(`Uploading '${localPath}' of ${toReadableSizeString(size)} size to '${remoteUri}'`);
  }
  const timer = new Timer().start();
  if (['http:', 'https:'].includes(parsedUri.protocol)) {
    if (!uploadOptions.fileFieldName) {
      uploadOptions.headers = Object.assign({},
        _.isPlainObject(uploadOptions.headers) ? uploadOptions.headers : {},
        {'Content-Length': size}
      );
    }
    await uploadFileToHttp(fs.createReadStream(localPath), parsedUri, uploadOptions);
  } else if (parsedUri.protocol === 'ftp:') {
    await uploadFileToFtp(fs.createReadStream(localPath), parsedUri, uploadOptions);
  } else {
    throw new Error(`Cannot upload the file at '${localPath}' to '${remoteUri}'. ` +
      `Unsupported remote protocol '${parsedUri.protocol}'. ` +
      `Only http/https and ftp/ftps protocols are supported.`);
  }
  if (isMetered) {
    log.info(`Uploaded '${localPath}' of ${toReadableSizeString(size)} size in ` +
      `${timer.getDuration().asSeconds.toFixed(3)}s`);
  }
}

/**
 * @typedef {Object} DownloadOptions
 * @property {boolean} isMetered [true] - Whether to log the actual download performance
 * (e.g. timings and speed)
 * @property {AuthCredentials} auth
 * @property {number} timeout [5000] - The actual request timeout in milliseconds
 * @property {Object} headers - Request headers mapping
 */

/**
 * Downloads the given file via HTTP(S)
 *
 * @param {string} remoteUrl - The remote url
 * @param {string} dstPath - The local path to download the file to
 * @param {?DownloadOptions} downloadOptions
 * @throws {Error} If download operation fails
 */
async function downloadFile (remoteUrl, dstPath, downloadOptions = {}) {
  const {
    isMetered = true,
    auth,
    timeout = 5000,
    headers,
  } = downloadOptions;

  const requestOpts = {
    url: remoteUrl,
    responseType: 'stream',
    timeout,
  };
  const axiosAuth = toAxiosAuth(auth);
  if (axiosAuth) {
    requestOpts.auth = axiosAuth;
  }
  if (_.isPlainObject(headers)) {
    requestOpts.headers = headers;
  }

  const timer = new Timer().start();
  let responseLength;
  try {
    const writer = fs.createWriteStream(dstPath);
    const {
      data: responseStream,
      headers: responseHeaders,
    } = await axios(requestOpts);
    responseLength = parseInt(responseHeaders['content-length'], 10);
    responseStream.pipe(writer);

    await new B((resolve, reject) => {
      responseStream.once('error', reject);
      writer.once('finish', resolve);
      writer.once('error', (e) => {
        responseStream.unpipe(writer);
        reject(e);
      });
    });
  } catch (err) {
    throw new Error(`Cannot download the file from ${remoteUrl}: ${err.message}`);
  }

  const {size} = await fs.stat(dstPath);
  if (responseLength && size !== responseLength) {
    await fs.rimraf(dstPath);
    throw new Error(`The size of the file downloaded from ${remoteUrl} (${size} bytes) ` +
      `differs from the one in Content-Length response header (${responseLength} bytes)`);
  }
  if (isMetered) {
    const secondsElapsed = timer.getDuration().asSeconds;
    log.debug(`${remoteUrl} (${toReadableSizeString(size)}) ` +
      `has been downloaded to '${dstPath}' in ${secondsElapsed.toFixed(3)}s`);
    if (secondsElapsed >= 2) {
      const bytesPerSec = Math.floor(size / secondsElapsed);
      log.debug(`Approximate download speed: ${toReadableSizeString(bytesPerSec)}/s`);
    }
  }
}

export { uploadFile, downloadFile };
