import type {constants, MakeDirectoryOptions, PathLike} from 'node:fs';
import type * as fsPromises from 'node:fs/promises';

/** The filesystem helpers of the entry writer, passed in by the caller (`fs` from `fs.ts` fits) */
export interface EntryFs extends Pick<
  typeof fsPromises,
  'chmod' | 'lstat' | 'readFile' | 'readlink' | 'realpath' | 'rename' | 'stat' | 'symlink' | 'unlink' | 'writeFile'
> {
  openFile: typeof fsPromises.open;
  constants: typeof constants;
  mkdir(path: string, opts?: MakeDirectoryOptions): Promise<string | undefined>;
  rimraf(path: PathLike): Promise<void>;
}

/** The filesystem helpers of the move operation, passed in by the caller */
export interface MoveFs {
  exists(path: PathLike): Promise<boolean>;
  rimraf(path: PathLike): Promise<void>;
}
