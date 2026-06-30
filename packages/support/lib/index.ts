import * as console from './console';
import * as doctor from './doctor';
import * as env from './env';
import { fs } from './fs';
import * as imageUtil from './image-util';
import * as logger from './logging';
import * as mjpeg from './mjpeg';
import { mkdirp } from './mkdirp';
import * as net from './net';
import * as node from './node';
import * as plist from './plist';
import * as process from './process';
import * as system from './system';
import * as tempDir from './tempdir';
import * as timing from './timing';
import * as util from './util';
import * as zip from './zip';

export { npm } from './npm';

const { cancellableDelay } = util;

export {
  cancellableDelay,
  console,
  doctor,
  env,
  fs,
  imageUtil,
  logger,
  mjpeg,
  mkdirp,
  net,
  node,
  plist,
  process,
  system,
  tempDir,
  timing,
  util,
  zip,
};
export default {
  tempDir,
  system,
  util,
  fs,
  cancellableDelay,
  plist,
  mkdirp,
  logger,
  process,
  zip,
  imageUtil,
  net,
  mjpeg,
  node,
  timing,
  env,
  console,
  doctor,
};

export type { ConsoleOpts } from './console';
export type { TextStyle } from './console';
export type { CopyFileOptions, ReadFn, WalkDirCallback } from './fs';
export type {
  AuthCredentials,
  DownloadOptions,
  FtpUploadOptions,
  HttpUploadOptions,
  NetOptions,
  NotHttpUploadOptions,
} from './net';
export type { ExecOpts, InstallPackageOpts, NpmInstallReceipt } from './npm';
export type { Affixes, OpenedAffixes } from './tempdir';
export type { EncodingOptions, LockFileOptions, NonEmptyString, PluralizeOptions, TruncateStringOptions } from './util';
export type { ExtractAllOptions, ZipCompressionOptions, ZipEntry, ZipOptions, ZipSourceOptions } from './zip';
