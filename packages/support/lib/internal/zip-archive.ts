import {createReadStream, type Stats} from 'node:fs';
import {lstat, readlink, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import type {Readable} from 'node:stream';

import picomatch from 'picomatch';
import {ZipFile} from 'yazl';

import {isWindows} from './platform.js';
import {walk} from './walker.js';

export interface ZipArchiveOptions {
  /** Deflate level, 0 (store) to 9 (best compression) */
  level: number;
  /** Only add entries matching this glob (relative to the source folder; dot files are skipped unless the glob matches them) */
  pattern?: string;
  /** Skip entries matching any of these globs (dot files included) */
  ignore?: string[];
  /** Full path to a file that must not be added, e.g. the archive being written into the source folder */
  exclude?: string;
}

function toMode(stats: Stats): number {
  // File modes are not reliable on Windows
  return isWindows() && stats.isDirectory() ? 0o40755 : stats.mode & 0xffff;
}

async function addEntry(zip: ZipFile, absPath: string, name: string, stats: Stats, level: number): Promise<void> {
  const common = {mtime: stats.mtime, mode: toMode(stats)};
  if (stats.isDirectory()) {
    zip.addEmptyDirectory(name, common);
  } else if (stats.isSymbolicLink()) {
    zip.addBuffer(Buffer.from(await readlink(absPath)), name, {...common, compress: false});
  } else if (stats.isFile()) {
    // Lazy, so only one file is open at a time and no stat is repeated (yazl API is callback-based)
    /* oxlint-disable promise/prefer-await-to-callbacks */
    zip.addReadStreamLazy(name, {...common, compressionLevel: level, size: stats.size}, (cb) =>
      cb(null, createReadStream(absPath)),
    );
    /* oxlint-enable promise/prefer-await-to-callbacks */
  }
}

async function populate(zip: ZipFile, output: Readable, srcPath: string, opts: ZipArchiveOptions): Promise<void> {
  const {level, pattern, ignore, exclude} = opts;
  const resolved = path.resolve(srcPath);
  // The root is followed if it is a symlink, while the entries below it are not
  if (!(await stat(resolved)).isDirectory()) {
    await addEntry(zip, resolved, path.basename(resolved), await lstat(resolved), level);
    zip.end();
    return;
  }

  const root = await realpath(resolved);
  // The walked paths are real ones, so the excluded file must be resolved the same way
  const excluded = exclude
    ? path.join(await realpath(path.dirname(path.resolve(exclude))), path.basename(exclude))
    : null;
  const isIncluded = pattern ? picomatch(pattern) : () => true;
  const isIgnored = ignore?.length ? picomatch(ignore, {dot: true}) : () => false;
  // Folders are matched both with and without the trailing slash, like `minimatch` does
  const matches = (isMatch: (name: string) => boolean, name: string, isDir: boolean) =>
    isMatch(name) || (isDir && isMatch(`${name}/`));
  for await (const {path: absPath, stats} of walk(root, {preserveSymlinks: true})) {
    if (output.destroyed) {
      return;
    }
    if (absPath === root || absPath === excluded) {
      continue;
    }
    const name = path.relative(root, absPath).split(path.sep).join('/');
    const isDir = stats.isDirectory();
    if (matches(isIncluded, name, isDir) && !matches(isIgnored, name, isDir)) {
      await addEntry(zip, absPath, name, stats, level);
    }
  }
  zip.end();
}

/**
 * Creates a ZIP archive stream out of a file or the contents of a folder.
 * Symlinks below the source are stored as such. Any failure destroys the returned stream with the error.
 *
 * @param srcPath The full path to the source file or folder. A file is stored under its base name.
 * @param opts Compression and filtering options. The filters only apply to folders.
 */
export function createZipStream(srcPath: string, opts: ZipArchiveOptions): Readable {
  const zip = new ZipFile();
  const output = zip.outputStream as Readable;
  // `on`, as yazl may report several failures (e.g. one per vanished file)
  zip.on('error', (err) => output.destroy(err));
  void (async () => {
    try {
      await populate(zip, output, srcPath, opts);
    } catch (err) {
      output.destroy(err as Error);
    }
  })();
  return output;
}
