import * as console from './console.js';
import * as doctor from './doctor.js';
import {fs} from './fs.js';
import * as logger from './logging.js';
import * as net from './net.js';
import * as node from './node.js';
import * as plist from './plist.js';
import * as system from './system.js';
import * as tempDir from './tempdir.js';
import * as timing from './timing.js';
import * as util from './util.js';
import * as zip from './zip.js';

export {console, doctor, fs, logger, net, node, plist, system, tempDir, timing, util, zip};
export default {
  tempDir,
  system,
  util,
  fs,
  plist,
  logger,
  zip,
  net,
  node,
  timing,
  console,
  doctor,
};

export type {ConsoleOpts} from './console.js';
export type {TextStyle} from './console.js';
export type {CopyFileOptions, WalkDirCallback} from './fs.js';
export type {AuthCredentials, DownloadOptions, HttpUploadOptions, NetOptions} from './net.js';
export type {Affixes, OpenedAffixes} from './tempdir.js';
export type {
  EncodingOptions,
  LockFileOptions,
  NonEmptyString,
  PluralizeOptions,
  TruncateStringOptions,
} from './util.js';
export type {ExtractAllOptions, ZipCompressionOptions, ZipEntry, ZipOptions, ZipSourceOptions} from './zip.js';
