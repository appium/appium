import crypto from 'node:crypto';
import type {FileHandle} from 'node:fs/promises';
import path from 'node:path';
import type {Readable} from 'node:stream';
import {text} from 'node:stream/consumers';
import {pipeline} from 'node:stream/promises';

import {fs} from '../fs.js';
import {isWindows} from '../system.js';
import {isSubPath} from '../util.js';

// Limit traversal to stop symlink cycles.
const MAX_SYMLINK_TRAVERSALS = 40;
// Upper bound of the remembered folders, they are simply verified again if it is exceeded.
const MAX_VERIFIED_DIRS = 100_000;
// Longest symlink target accepted when a written file is converted to a link.
const MAX_SYMLINK_TARGET_SIZE = 64 * 1024;

export interface ZipEntryWriterOptions {
  /** Real path of the extraction root */
  dir: string;
  defaultDirMode?: string;
  defaultFileMode?: string;
}

/** Archive-agnostic entry description. Names are untrusted and are validated by the writer. */
export interface ExtractableEntry {
  fileName: string;
  /** Unix mode as stored in the archive (including file type bits), 0 if unknown */
  mode: number;
  isDir: boolean;
  isSymlink: boolean;
  /** Opens the entry content; it is only called for files and symlinks */
  openBody: () => Promise<Readable>;
}

/** A file entry whose destination folder is verified; opening it is safe to run concurrently. */
export interface PreparedFile {
  fileName: string;
  dest: string;
  /** The folder of the file, as it was verified */
  dirPath: string;
  verifiedDir: VerifiedDir;
  /** Permission bits for a newly created file */
  mode: number;
}

/** A file being written whose content replaces the destination only when it is complete. */
export interface ReplacementFile {
  file: FileHandle;
  /** Makes the content the destination. Call it after the file is closed. */
  commit: () => Promise<void>;
  /** Removes what was written. Call it after the file is closed. */
  discard: () => Promise<void>;
}

export interface OpenedFile {
  file: FileHandle;
  /** False if an existing file was replaced (its permissions were kept) */
  created: boolean;
}

/** A folder inside of the root that was checked, with the identity it had at that moment */
interface VerifiedDir {
  realPath: string;
  /** Null for the root, which is never replaced */
  identity: {ino: number; dev: number} | null;
}

interface SymlinkTarget {
  linkTarget: string;
  linkParentDir: string;
  fileName: string;
  missingPaths: Set<string>;
}

/**
 * Writes archive entries below a root directory. Keeps all path, symlink and
 * mode safety checks in one place, so they apply to any archive reader.
 */
export class ZipEntryWriter {
  private readonly opts: ZipEntryWriterOptions;
  private caseInsensitive = true;
  private normalizationInsensitive = true;
  // Normalized missing-path keys -> links to recheck when those paths become symlinks.
  private readonly symlinkDependents = new Map<string, Set<SymlinkTarget>>();
  // Directories already validated within the root.
  private readonly verifiedDirs = new Map<string, VerifiedDir>();

  /**
   * @param opts The root and the default permissions
   */
  constructor(opts: ZipEntryWriterOptions) {
    this.opts = opts;
  }

  /**
   * Writes a single entry. Resource-fork entries (`__MACOSX/`) are skipped.
   *
   * @throws {Error} If the entry would end up outside of the root
   */
  async write(entry: ExtractableEntry): Promise<void> {
    const {fileName, mode, isDir, isSymlink, openBody} = entry;
    if (isIgnoredEntry(fileName)) {
      return;
    }

    const dest = this.resolveWithinRoot(fileName);
    const procMode = this.getExtractedMode(mode, isDir) & 0o777;
    // always ensure folders are created
    const destDir = isDir ? dest : path.dirname(dest);
    const verifiedDir = await this.ensureDirWithinRoot(destDir, fileName, isDir ? procMode : undefined);
    if (isDir) {
      return;
    }

    if (isSymlink) {
      const linkTarget = await text(await openBody());
      await this.assertDirUnchanged(destDir, verifiedDir);
      await this.createValidatedSymlink(linkTarget, dest, verifiedDir.realPath, fileName);
    } else {
      const readStream = await openBody();
      try {
        const {file} = await this.openPrepared({fileName, dest, dirPath: destDir, verifiedDir, mode: procMode});
        try {
          await pipeline(readStream, file.createWriteStream());
        } finally {
          await file.close();
        }
      } finally {
        // Opening the output may fail before pipeline takes ownership of the input.
        readStream.destroy();
      }
    }
  }

  /**
   * Verifies the destination folder of a file entry (creating it if needed).
   * Calls must not overlap, but the prepared files can be opened concurrently.
   *
   * @throws {Error} If the entry would end up outside of the root
   */
  async prepareFile(fileName: string, mode = 0): Promise<PreparedFile> {
    const dest = this.resolveWithinRoot(fileName);
    const dirPath = path.dirname(dest);
    const verifiedDir = await this.ensureDirWithinRoot(dirPath, fileName);
    return {fileName, dest, dirPath, verifiedDir, mode: this.getExtractedMode(mode, false) & 0o777};
  }

  /**
   * Opens a prepared file for writing. Existing files are replaced, but never through a link.
   *
   * @throws {Error} If the destination is a symlink or resolves outside of the root
   */
  async openPrepared(prepared: PreparedFile): Promise<OpenedFile> {
    const {fileName, dest, dirPath, verifiedDir, mode} = prepared;
    await this.assertDirUnchanged(dirPath, verifiedDir);
    const create = this.createFlags();
    try {
      // Exclusive creation never follows or replaces anything, so the checks below are not needed
      return {file: await fs.openFile(dest, create, mode), created: true};
    } catch (err: any) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }

    await this.assertFileDestinationWithinRoot(dest, verifiedDir.realPath, fileName);
    try {
      return {
        file: await fs.openFile(dest, (create & ~fs.constants.O_EXCL) | fs.constants.O_TRUNC, mode),
        created: false,
      };
    } catch (err: any) {
      if (err.code !== 'EACCES' && err.code !== 'EPERM') {
        throw err;
      }
      // A read-only file: replace it like `unzip -o` and `bsdtar` do
      try {
        await fs.unlink(dest);
      } catch {
        throw err;
      }
      return {file: await fs.openFile(dest, create, mode), created: true};
    }
  }

  /**
   * Opens a file whose content is not trusted until the caller has verified it.
   * An existing destination stays intact until {@link ReplacementFile.commit} is called.
   *
   * @throws {Error} If the destination is a symlink or resolves outside of the root
   */
  async openForReplacement(prepared: PreparedFile): Promise<ReplacementFile> {
    const {fileName, dest, dirPath, verifiedDir, mode} = prepared;
    await this.assertDirUnchanged(dirPath, verifiedDir);
    const create = this.createFlags();
    // The folder may have been replaced while the content was downloaded: never remove or rename through it then
    const removeQuietly = async (target: string) => {
      try {
        await this.assertDirUnchanged(dirPath, verifiedDir);
        await fs.unlink(target);
      } catch {
        // already gone, or not ours to remove anymore
      }
    };
    try {
      const file = await fs.openFile(dest, create, mode);
      return {file, commit: async () => {}, discard: async () => await removeQuietly(dest)};
    } catch (err: any) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }

    await this.assertFileDestinationWithinRoot(dest, verifiedDir.realPath, fileName);
    // A short name in the same folder: the destination name may already be as long as a name can be
    const temp = path.join(path.dirname(dest), `.zip-${crypto.randomBytes(6).toString('hex')}.tmp`);
    const file = await fs.openFile(temp, create, mode);
    return {
      file,
      commit: async () => {
        await this.assertDirUnchanged(dirPath, verifiedDir);
        await fs.rename(temp, dest);
      },
      discard: async () => await removeQuietly(temp),
    };
  }

  /**
   * Identifies the file that the entry is written to, so that entries that
   * end up in the same file can be told apart from the others.
   */
  fileKey(prepared: PreparedFile): string {
    return path.join(prepared.verifiedDir.realPath, path.basename(prepared.dest)).normalize('NFD').toLowerCase();
  }

  /**
   * Finds out which spellings of a name the filesystem of the root treats as the same one, so that
   * {@link pathKey} neither merges distinct files nor misses aliases. Call it once before using the keys.
   */
  async detectNaming(): Promise<void> {
    const {dir} = this.opts;
    const id = crypto.randomBytes(6).toString('hex');
    const probe = async (created: string, alias: string): Promise<boolean> => {
      const createdPath = path.join(dir, `.zip-probe-${id}-${created}`);
      try {
        await fs.writeFile(createdPath, '');
        try {
          await fs.lstat(path.join(dir, `.zip-probe-${id}-${alias}`));
          return true;
        } catch {
          return false;
        }
      } finally {
        await fs.rimraf(createdPath);
      }
    };
    try {
      this.caseInsensitive = await probe('a', 'A');
      this.normalizationInsensitive = await probe('\u00e9', 'e\u0301');
    } catch {
      // Cannot tell: assume that names may be aliases, which only costs some precision
      this.caseInsensitive = true;
      this.normalizationInsensitive = true;
    }
  }

  /** Identifies the path of the entry on this filesystem, for telling apart entries that replace each other. */
  pathKey(fileName: string): string {
    let key = path.resolve(this.opts.dir, fileName);
    if (this.normalizationInsensitive) {
      key = key.normalize('NFD');
    }
    return this.caseInsensitive ? key.toLowerCase() : key;
  }

  /**
   * Replaces already written regular files, whose content is the link target,
   * with validated symlinks. Used by readers that learn an entry is a link only
   * after its content was streamed (the central directory comes last).
   * All placeholders are removed first, so links may refer to each other in any order.
   *
   * @throws {Error} If an entry is not a plain small file or a target is unsafe
   */
  async convertToSymlinks(fileNames: string[]): Promise<void> {
    const links: Array<{fileName: string; dest: string; linkTarget: string}> = [];
    for (const fileName of fileNames) {
      if (isIgnoredEntry(fileName)) {
        continue;
      }
      const dest = this.resolveWithinRoot(fileName);
      await this.assertParentUnchanged(dest, fileName);
      const stats = await fs.lstat(dest);
      if (!stats.isFile() || stats.size > MAX_SYMLINK_TARGET_SIZE) {
        throw new Error(`Cannot convert "${dest}" to a symlink while processing file ${fileName}`);
      }
      links.push({fileName, dest, linkTarget: await fs.readFile(dest, 'utf8')});
      await fs.unlink(dest);
    }
    for (const {fileName, dest, linkTarget} of links) {
      const dirPath = path.dirname(dest);
      const verifiedDir = await this.ensureDirWithinRoot(dirPath, fileName);
      await this.assertDirUnchanged(dirPath, verifiedDir);
      await this.createValidatedSymlink(linkTarget, dest, verifiedDir.realPath, fileName);
    }
  }

  /**
   * Applies the permission bits of a Unix mode to an already written file or folder. Symlinks are not followed.
   * No-op on Windows. The caller decides whether the entry has a mode at all, because a mode may legitimately
   * have no permission bits.
   */
  async applyMode(fileName: string, mode: number): Promise<void> {
    const permissions = mode & 0o777;
    if (isWindows() || isIgnoredEntry(fileName)) {
      return;
    }
    const dest = this.resolveWithinRoot(fileName);
    if (dest === this.opts.dir) {
      // The entry for the root itself (e.g. "./"): the folder of the caller keeps its permissions
      return;
    }
    await this.assertParentUnchanged(dest, fileName);
    // Same result as creating the entry with this mode
    const effective = permissions & ~process.umask();
    let handle;
    try {
      handle = await fs.openFile(dest, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    } catch (err: any) {
      if (err.code === 'ENOENT' || err.code === 'ELOOP') {
        return;
      }
      if (err.code !== 'EACCES' && err.code !== 'EPERM') {
        throw err;
      }
      // Not readable, so it cannot be opened: fall back to the path
      await this.chmodIfPlain(dest, effective);
      return;
    }
    try {
      const stats = await handle.stat();
      if ((stats.isFile() || stats.isDirectory()) && (stats.mode & 0o777) !== effective) {
        await handle.chmod(effective);
      }
    } finally {
      await handle.close();
    }
  }

  /** Whether files created from entries without permissions already have these permission bits */
  isDefaultFileMode(mode: number): boolean {
    return (mode & 0o777) === (this.getExtractedMode(0, false) & 0o777);
  }

  private async ensureDirWithinRoot(dirPath: string, fileName: string, mode?: number): Promise<VerifiedDir> {
    const cached = this.verifiedDirs.get(dirPath);
    if (cached) {
      return cached;
    }

    const {dir} = this.opts;
    if (!isSubPath(dirPath, dir)) {
      throw new Error(`Out of bound path "${dirPath}" found while processing file ${fileName}`);
    }

    const relativePath = path.relative(dir, dirPath);
    if (!relativePath) {
      return {realPath: dir, identity: null};
    }

    if (this.verifiedDirs.size > MAX_VERIFIED_DIRS) {
      this.verifiedDirs.clear();
    }
    let current: VerifiedDir | undefined;
    let parent: VerifiedDir = {realPath: dir, identity: null};
    let currentPath = dir;
    for (const segment of relativePath.split(path.sep)) {
      if (current) {
        parent = current;
      }
      currentPath = path.join(currentPath, segment);
      current = this.verifiedDirs.get(currentPath);
      if (current) {
        continue;
      }
      current = await this.inspectDir(currentPath, fileName);
      if (!current) {
        // The remembered parent is not looked up again by mkdir, so make sure it is still the verified one
        await this.assertDirUnchanged(path.dirname(currentPath), parent);
        // The result of mkdir is not trusted: whatever is there now is checked like an existing folder
        await fs.mkdir(currentPath, {mode});
        current = await this.inspectDir(currentPath, fileName);
      }
      if (!current) {
        throw new Error(`Cannot create the directory "${currentPath}" while processing file ${fileName}`);
      }
      this.verifiedDirs.set(currentPath, current);
    }
    return current as VerifiedDir;
  }

  /**
   * Resolves an existing folder (or a link to a folder) and checks it is within the root.
   *
   * @returns Undefined if the path does not exist
   */
  private async inspectDir(dirPath: string, fileName: string): Promise<VerifiedDir | undefined> {
    const {dir} = this.opts;
    try {
      // The folder itself, after following links: this is where the files end up
      const [stats, realPath] = await Promise.all([fs.stat(dirPath), fs.realpath(dirPath)]);
      if (!isSubPath(realPath, dir)) {
        throw new Error(`Out of bound path "${dirPath}" found while processing file ${fileName}`);
      }
      if (!stats.isDirectory()) {
        throw new Error(`Cannot create a directory over existing file "${dirPath}"`);
      }
      return {realPath, identity: {ino: stats.ino, dev: stats.dev}};
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return undefined;
      }
      throw err;
    }
  }

  /**
   * Remembered folders are not checked again when they are reused, so make sure that neither
   * the folder nor any of its parents was replaced (e.g. with a link) since it was verified.
   */
  private async assertDirUnchanged(dirPath: string, verified: VerifiedDir): Promise<void> {
    const {identity} = verified;
    if (!identity) {
      return;
    }
    // Looking up the folder passes through its parents and links, so replacing any of them changes the result
    const stats = await fs.stat(dirPath);
    if (stats.ino !== identity.ino || stats.dev !== identity.dev) {
      throw new Error(`Out of bound path "${dirPath}": the folder was replaced during the extraction`);
    }
  }

  /** Makes sure that the folder of an entry written earlier is still the verified one, so that nothing outside of the root is touched */
  private async assertParentUnchanged(dest: string, fileName: string): Promise<void> {
    if (dest === this.opts.dir) {
      // An entry for the root itself (e.g. "./")
      return;
    }
    const dirPath = path.dirname(dest);
    await this.assertDirUnchanged(dirPath, await this.ensureDirWithinRoot(dirPath, fileName));
  }

  /** The fallback for entries that cannot be opened: a short window remains between the check and the change. */
  private async chmodIfPlain(dest: string, permissions: number): Promise<void> {
    let stats;
    try {
      stats = await fs.lstat(dest);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return;
      }
      throw err;
    }
    if ((stats.isFile() || stats.isDirectory()) && (stats.mode & 0o777) !== permissions) {
      await fs.chmod(dest, permissions);
    }
  }

  private createFlags(): number {
    const noFollow = isWindows() ? 0 : fs.constants.O_NOFOLLOW;
    return fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | noFollow;
  }

  private resolveWithinRoot(fileName: string): string {
    const {dir} = this.opts;
    const dest = path.resolve(dir, fileName);
    if (!isSubPath(dest, dir)) {
      throw new Error(`Out of bound path "${dest}" found while processing file ${fileName}`);
    }
    return dest;
  }

  private async assertFileDestinationWithinRoot(dest: string, realDestDir: string, fileName: string): Promise<void> {
    const {dir} = this.opts;
    let realDest: string | null = null;
    try {
      if ((await fs.lstat(dest)).isSymbolicLink()) {
        throw new Error(`Cannot write a file over existing symlink "${dest}"`);
      }
      realDest = await fs.realpath(dest);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    realDest = realDest ?? path.resolve(realDestDir, path.basename(dest));
    if (!isSubPath(realDest, dir)) {
      throw new Error(`Out of bound path "${dest}" found while processing file ${fileName}`);
    }
  }

  private getExtractedMode(entryMode: number, isDir: boolean): number {
    const {defaultDirMode, defaultFileMode} = this.opts;

    let mode = entryMode;
    // Set defaults, if necessary
    if (mode === 0) {
      if (isDir) {
        if (defaultDirMode) {
          mode = parseInt(defaultDirMode, 10);
        }

        if (!mode) {
          mode = 0o755;
        }
      } else {
        if (defaultFileMode) {
          mode = parseInt(defaultFileMode, 10);
        }

        if (!mode) {
          mode = 0o644;
        }
      }
    }

    return mode;
  }

  /**
   * Reject escaping targets or excessive traversal; return missing-path keys for later rechecks.
   */
  private async validateSymlinkTarget(
    linkTarget: string,
    linkParentDir: string,
    fileName: string,
  ): Promise<Set<string>> {
    // Resolve links before '..'; realpath alone cannot handle missing targets.
    const separator = isWindows() ? /[\\/]+/ : /\/+/;
    const targetRoot = path.isAbsolute(linkTarget) ? path.parse(linkTarget).root : '';
    let resolvedPath = targetRoot || linkParentDir;
    const remainingSegments = linkTarget.slice(targetRoot.length).split(separator);
    const missingPaths = new Set<string>();
    let followedLinks = 0;

    while (remainingSegments.length) {
      const segment = remainingSegments.shift();
      if (!segment || segment === '.') {
        continue;
      }
      if (segment === '..') {
        resolvedPath = path.dirname(resolvedPath);
        continue;
      }

      const candidatePath = path.join(resolvedPath, segment);
      let nestedLinkTarget: string | null = null;
      try {
        const stats = await fs.lstat(candidatePath);
        if (stats.isSymbolicLink()) {
          nestedLinkTarget = await fs.readlink(candidatePath);
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
        // An absent component may become a symlink in a later ZIP entry.
        missingPaths.add(this.getSymlinkDependencyKey(candidatePath));
      }

      // Advance past ordinary or missing components.
      if (nestedLinkTarget === null) {
        resolvedPath = candidatePath;
        continue;
      }

      followedLinks += 1;
      if (followedLinks > MAX_SYMLINK_TRAVERSALS) {
        throw new Error(`Too many symlinks while processing file ${fileName}`);
      }
      // Resolve relative targets from the link's parent, absolute targets from their root.
      if (path.isAbsolute(nestedLinkTarget)) {
        resolvedPath = path.parse(nestedLinkTarget).root;
        nestedLinkTarget = nestedLinkTarget.slice(resolvedPath.length);
      }
      remainingSegments.unshift(...nestedLinkTarget.split(separator));
    }

    if (!isSubPath(resolvedPath, this.opts.dir)) {
      throw new Error(`Out of bound symlink target "${linkTarget}" found while processing file ${fileName}`);
    }
    return missingPaths;
  }

  private updateSymlinkDependencies(target: SymlinkTarget, missingPaths: Set<string>): void {
    for (const missingPath of target.missingPaths) {
      const dependents = this.symlinkDependents.get(missingPath);
      dependents?.delete(target);
      if (!dependents?.size) {
        this.symlinkDependents.delete(missingPath);
      }
    }
    target.missingPaths = missingPaths;
    for (const missingPath of missingPaths) {
      let dependents = this.symlinkDependents.get(missingPath);
      if (!dependents) {
        dependents = new Set();
        this.symlinkDependents.set(missingPath, dependents);
      }
      dependents.add(target);
    }
  }

  private async createValidatedSymlink(
    linkTarget: string,
    dest: string,
    linkParentDir: string,
    fileName: string,
  ): Promise<void> {
    // Reject an escaping target before creating the link on disk.
    await this.validateSymlinkTarget(linkTarget, linkParentDir, fileName);
    await fs.symlink(linkTarget, dest);
    try {
      const target: SymlinkTarget = {linkTarget, linkParentDir, fileName, missingPaths: new Set()};
      // Recheck for cycles and redirected forward references after creating the link.
      const key = this.getSymlinkDependencyKey(path.join(linkParentDir, path.basename(dest)));
      const affectedTargets = [target, ...(this.symlinkDependents.get(key) ?? [])];
      for (const affectedTarget of affectedTargets) {
        const missingPaths = await this.validateSymlinkTarget(
          affectedTarget.linkTarget,
          affectedTarget.linkParentDir,
          affectedTarget.fileName,
        );
        this.updateSymlinkDependencies(affectedTarget, missingPaths);
      }
    } catch (err) {
      // Roll back the link that invalidated a target.
      await fs.unlink(dest);
      throw err;
    }
  }

  private getSymlinkDependencyKey(absolutePath: string): string {
    // Normalize keys, not filesystem paths. Collisions only cause extra checks.
    return absolutePath.normalize('NFD').toLowerCase();
  }
}

/** Whether the entry is never extracted (macOS resource forks) */
export function isIgnoredEntry(fileName: string): boolean {
  return fileName.startsWith('__MACOSX/');
}
