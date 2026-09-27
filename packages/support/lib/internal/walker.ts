import {strict as assert} from 'node:assert';
import * as nodeFs from 'node:fs';
import path from 'node:path';
import {Readable, type ReadableOptions} from 'node:stream';
import {fileURLToPath} from 'node:url';

/**
 * A recursive, stream-based filesystem walker.
 *
 * Vendored (and simplified for our own usage) from the `klaw` package
 * (https://github.com/jprichardson/node-klaw) to drop the external
 * dependency; only the surface used by {@linkcode fs.walk} and
 * {@linkcode fs.walkDir} is kept.
 *
 * klaw's original license (https://github.com/jprichardson/node-klaw/blob/4.1.0/LICENSE):
 *
 * (The MIT License)
 *
 * Copyright (c) 2015-2016 JP Richardson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the 'Software'), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 * the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

export interface WalkItem {
  path: string;
  stats: nodeFs.Stats;
}

export type WalkQueueMethod = 'shift' | 'pop';

/** The subset of `node:fs`'s callback API this walker relies on. */
export interface WalkFs {
  stat: typeof nodeFs.stat;
  lstat: typeof nodeFs.lstat;
  readdir: typeof nodeFs.readdir;
}

export interface WalkOptions extends ReadableOptions {
  /** Order in which queued paths are visited. Defaults to `'shift'` (breadth-first). */
  queueMethod?: WalkQueueMethod;
  /** Sorts each directory's entries before they are queued. */
  pathSorter?: (pathA: string, pathB: string) => number;
  /** Custom `fs`-like implementation (e.g. for mocking). Only `stat`/`lstat`/`readdir` are used. Defaults to `node:fs`. */
  fs?: WalkFs;
  /** Only queues entries for which this returns `true`. */
  filter?: (path: string) => boolean;
  /** How many levels below the root to recurse into. `-1` (default) means unlimited. */
  depthLimit?: number;
  /** Use `lstat` instead of `stat`, so symlinks are reported instead of followed. */
  preserveSymlinks?: boolean;
}

interface NormalizedWalkOptions extends WalkOptions {
  queueMethod: WalkQueueMethod;
  objectMode: true;
}

export class Walker extends Readable {
  private readonly root: string;
  private readonly options: NormalizedWalkOptions;
  private readonly rootDepth?: number;
  private readonly walkFs: WalkFs;
  private paths: string[];

  constructor(dir: string | URL, options?: WalkOptions) {
    const resolvedDir = dir instanceof URL ? fileURLToPath(dir) : dir;
    assert.strictEqual(
      typeof resolvedDir,
      'string',
      `'dir' parameter should be of type string or file URL. Got type: ${typeof resolvedDir}`,
    );

    const normalizedOptions: NormalizedWalkOptions = {
      queueMethod: 'shift',
      pathSorter: undefined,
      filter: undefined,
      depthLimit: undefined,
      preserveSymlinks: false,
      ...options,
      objectMode: true,
    };

    super(normalizedOptions);
    this.root = path.resolve(resolvedDir);
    this.paths = [this.root];
    this.options = normalizedOptions;
    if (normalizedOptions.depthLimit !== undefined && normalizedOptions.depthLimit > -1) {
      this.rootDepth = this.root.split(path.sep).length + 1;
    }
    this.walkFs = normalizedOptions.fs ?? nodeFs;
  }

  override _read(): void {
    if (this.paths.length === 0) {
      this.push(null);
      return;
    }
    const pathItem = this.paths[this.options.queueMethod]() as string;
    const statFunction = this.options.preserveSymlinks ? this.walkFs.lstat : this.walkFs.stat;

    statFunction(pathItem, (err, stats) => {
      const item: WalkItem = {path: pathItem, stats};
      if (err) {
        this.emit('error', err, item);
        return;
      }

      const belowDepthLimit =
        this.rootDepth !== undefined &&
        pathItem.split(path.sep).length - this.rootDepth >= (this.options.depthLimit as number);
      if (!stats.isDirectory() || belowDepthLimit) {
        this.push(item);
        return;
      }

      this.walkFs.readdir(pathItem, (readdirErr, pathItems) => {
        if (readdirErr) {
          this.push(item);
          this.emit('error', readdirErr, item);
          return;
        }

        let children = pathItems.map((part) => path.join(pathItem, part));
        if (this.options.filter) {
          children = children.filter(this.options.filter);
        }
        if (this.options.pathSorter) {
          children.sort(this.options.pathSorter);
        }
        this.paths.push(...children);

        this.push(item);
      });
    });
  }

  override read(size?: number): WalkItem {
    return super.read(size);
  }

  override [Symbol.asyncIterator](): NodeJS.AsyncIterator<WalkItem> {
    return super[Symbol.asyncIterator]() as NodeJS.AsyncIterator<WalkItem>;
  }
}

/** Walks `root` recursively, returning a readable object-mode stream / async iterator of {@linkcode WalkItem}s. */
export function walk(root: string | URL, options?: WalkOptions): Walker {
  return new Walker(root, options);
}
