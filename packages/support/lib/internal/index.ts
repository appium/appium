/**
 * Package-internal code, not exported from `@appium/support`. The rest of the package must import it from here
 * only, and it must not import anything from outside of this folder (see `test/unit/internal/layering.spec.ts`).
 */
export {
  closeStream,
  DEFAULT_FILE_FIELD_NAME,
  DEFAULT_TIMEOUT_MS,
  type HttpLog,
  type HttpUploadParams,
  type HttpUploadRequest,
  toAxiosAuth,
  uploadFileToHttp,
} from './http-upload.js';
export {createBase64EncodeStream} from './base64-encode-stream.js';
export type {EntryFs, ExtractFs, MoveFs} from './fs-like.js';
export {MoveOperation, type MvOptions} from './move-operation.js';
export {isPlainObject} from './plain-object.js';
export {isWindows} from './platform.js';
export {toBufferDeep, toBufferIfBinaryLike} from './plist-buffers.js';
export {pluralize, type PluralizeOptions} from './pluralize.js';
export {sizeOf} from './sizeof.js';
export {isSubPath} from './sub-path.js';
export {isUnicodeSupported, NullWritable, streamSupportsColor, stripAnsi} from './terminal.js';
export {GiB, KiB, MiB} from './units.js';
export {walk, Walker, type WalkItem, type WalkOptions} from './walker.js';
export {WriteQueue} from './write-queue.js';
export {
  createOpenReadStream,
  openZip,
  type OpenReadStreamFn,
  processYauzlEntriesSequentially,
  toEntryFileName,
} from './yauzl-helpers.js';
export {ZipExtractor, type ZipExtractorOptions} from './zip-extractor.js';
export {
  assertContent,
  assertSupportedEntry,
  BUFFERED_ENTRY_LIMIT,
  decodeEntry,
  EntrySink,
  INFLATE_CHUNK_SIZE,
  LOCAL_HEADER_SIZE,
  MAX_PENDING_BYTES,
  METHOD_DEFLATE,
  normalizeConcurrency,
  SIG_LOCAL,
  type SinkContext,
  ZipStreamUnsupportedError,
} from './zip-entry-sink.js';
export {
  isIgnoredEntry,
  type ExtractableEntry,
  type PreparedFile,
  type ZipEntryWriterOptions,
  ZipEntryWriter,
} from './zip-entry-writer.js';
export {extractZipStream, type ZipStreamLog, type ZipStreamOptions, type ZipStreamResult} from './zip-stream-parser.js';
