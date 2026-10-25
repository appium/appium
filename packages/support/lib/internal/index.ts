/**
 * Package-internal code. Not exported from `@appium/support`.
 *
 * This barrel is the only way for the rest of the package to reach it. To keep the module graph acyclic,
 * the modules here import nothing from outside of this folder, not even types; whatever they need from the
 * rest of the package (like the `fs` helpers or a logger) is passed in. See `test/unit/internal/layering.spec.ts`.
 */
export {createBase64EncodeStream} from './base64-encode-stream.js';
export type {EntryFs, MoveFs} from './fs-like.js';
export {MoveOperation, type MvOptions} from './move-operation.js';
export {isWindows} from './platform.js';
export {pluralize, type PluralizeOptions} from './pluralize.js';
export {isSubPath} from './sub-path.js';
export {GiB, KiB, MiB} from './units.js';
export {walk, Walker, type WalkItem, type WalkOptions} from './walker.js';
export {WriteQueue} from './write-queue.js';
export {
  assertContent,
  assertSupportedEntry,
  BUFFERED_ENTRY_LIMIT,
  DEFAULT_CONCURRENCY,
  EntrySink,
  INFLATE_CHUNK_SIZE,
  MAX_PENDING_BYTES,
  METHOD_DEFLATE,
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
