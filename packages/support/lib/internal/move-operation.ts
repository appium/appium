import {type BigIntStats, type PathLike, promises as fsPromises, type Stats} from 'node:fs';
import path from 'node:path';

import type {MoveFs} from './fs-like.js';
import {isWindows} from './platform.js';
import {isSubPath} from './sub-path.js';

/** Options for {@linkcode fs.mv} */
export interface MvOptions {
  /** Whether to automatically create the destination folder structure */
  mkdirp?: boolean;
  /** Set to false to throw if the destination file already exists */
  clobber?: boolean;
}

/** Encapsulates a move and its options, including recursive directory transfers. */
export class MoveOperation {
  constructor(
    private readonly from: string,
    private readonly to: string,
    private readonly opts: MvOptions,
    private readonly fs: MoveFs,
  ) {}

  /** Move the source entry and clean it up after a successful transfer. */
  async move(): Promise<void> {
    const {from, to} = this;
    const fromStat = await this.getSourceStats();
    const toStat = await this.getDestinationStats(fromStat);
    // Renaming an entry onto itself is a no-op, but the final cleanup would delete it.
    if (toStat && fromStat.dev === toStat.dev && fromStat.ino === toStat.ino) {
      await this.renameCaseOnlyEntry(fromStat);
      return;
    }
    if (fromStat.isDirectory() && isSubPath(path.resolve(to), path.resolve(from))) {
      throw new Error(`Cannot move '${from}' to '${to}' because the destination is inside the source`);
    }
    if (fromStat.isFile() || fromStat.isSymbolicLink()) {
      const dstRootWasCreated = await this.ensureDestination(path.dirname(to));
      await this.renameFile(from, to, dstRootWasCreated);
    } else if (fromStat.isDirectory()) {
      await this.moveDirectory();
    } else {
      return;
    }

    await this.fs.rimraf(from);
  }

  private async getSourceStats(): Promise<BigIntStats> {
    const {from} = this;
    try {
      return await fsPromises.lstat(from, {bigint: true});
    } catch (err) {
      if (isErrnoException(err) && err.code === 'ENOENT') {
        throw new Error(`The source path '${from}' does not exist or is not accessible`, {
          cause: err,
        });
      }
      throw err;
    }
  }

  private async getDestinationStats(fromStat: BigIntStats): Promise<BigIntStats | undefined> {
    const {to} = this;
    // Directory moves merge into the destination, so follow its final symlink.
    // File and symlink moves replace the destination entry itself.
    let toStat: BigIntStats | undefined;
    try {
      toStat = await (fromStat.isDirectory() ? fsPromises.stat : fsPromises.lstat)(to, {bigint: true});
    } catch (err) {
      if (!isErrnoException(err) || err.code !== 'ENOENT') {
        throw err;
      }
    }
    return toStat;
  }

  private async renameCaseOnlyEntry(fromStat: BigIntStats): Promise<void> {
    const {from, to} = this;
    const fromName = path.basename(from);
    const toName = path.basename(to);
    if (
      isWindows() &&
      fromName !== toName &&
      fromName.toLowerCase() === toName.toLowerCase() &&
      (await fsPromises.realpath(path.dirname(from))) === (await fsPromises.realpath(path.dirname(to)))
    ) {
      // Windows preserves spelling even when names identify the same entry. Do not remove
      // either path: rename changes the spelling, and cleanup would delete the renamed entry.
      const toEntry = await fsPromises.lstat(to, {bigint: true});
      if (fromStat.dev === toEntry.dev && fromStat.ino === toEntry.ino) {
        await fsPromises.rename(from, to);
      }
    }
  }

  private async moveDirectory(): Promise<void> {
    const {from, to, opts} = this;
    const dstRootWasCreated = await this.ensureDestination(to);
    // an empty directory has nothing to rename, so a missing or non-directory
    // destination would fall through to rimraf and delete the source
    if (!dstRootWasCreated) {
      await this.validateDestinationDirectory();
    }
    const items = await fsPromises.readdir(from, {withFileTypes: true});
    for (const item of items) {
      const srcPath = path.join(from, item.name);
      const destPath = path.join(to, item.name);
      if (item.isDirectory()) {
        // the recursive call requires an existing destination, even without mkdirp
        await fsPromises.mkdir(destPath, {recursive: true});
        await new MoveOperation(srcPath, destPath, opts, this.fs).move();
      } else if (item.isFile() || item.isSymbolicLink()) {
        await this.renameFile(srcPath, destPath, dstRootWasCreated);
      }
    }
  }

  private async validateDestinationDirectory(): Promise<void> {
    const {from, to} = this;
    let dstStat: Stats;
    try {
      dstStat = await fsPromises.stat(to);
    } catch (err) {
      if (isErrnoException(err) && err.code === 'ENOENT') {
        throw new Error(`Cannot move '${from}' to '${to}' because the destination does not exist`, {
          cause: err,
        });
      }
      throw err;
    }
    if (!dstStat.isDirectory()) {
      throw new Error(`Cannot move '${from}' to '${to}' because the destination is not a directory`);
    }
  }

  private async ensureDestination(p: PathLike): Promise<boolean> {
    if (this.opts?.mkdirp && !(await this.fs.exists(p))) {
      await fsPromises.mkdir(p, {recursive: true});
      return true;
    }
    return false;
  }

  private async renameFile(src: PathLike, dst: PathLike, skipExistenceCheck: boolean): Promise<void> {
    if (!skipExistenceCheck && (await this.fs.exists(dst))) {
      if (this.opts?.clobber === false) {
        const err = new Error(`The destination path '${dst?.toString()}' already exists`) as NodeJS.ErrnoException;
        err.code = 'EEXIST';
        throw err;
      }
      await this.fs.rimraf(dst);
    }
    try {
      await fsPromises.rename(src, dst);
    } catch (err) {
      if (isErrnoException(err) && err.code === 'EXDEV') {
        // Preserve relative and dangling links when rename crosses filesystems.
        await fsPromises.cp(String(src), String(dst), {verbatimSymlinks: true});
        await this.fs.rimraf(src);
      } else {
        throw err;
      }
    }
  }
}

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
