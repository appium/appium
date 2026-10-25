import crypto from 'node:crypto';
import path from 'node:path';
import {afterEach, beforeEach} from 'node:test';

import {fs, tempDir} from '../lib/index.js';
import {isWindows} from '../lib/system.js';
import * as zip from '../lib/zip.js';
import {type BuildEntry, chunked, snapshot} from './zip-builder.js';

export const FILE = 0o100644;
export const EXEC = 0o100755;
export const DIR = 0o40755;
export const LINK = 0o120777;

export const bigRandom = crypto.randomBytes(40_000);
export const bigText = Buffer.from('lorem ipsum dolor sit amet '.repeat(2_500));

/** Entries resembling an iOS app bundle, with links, permissions and a resource fork */
export function appEntries(): BuildEntry[] {
  return [
    {name: 'Payload/', mode: DIR},
    {name: 'Payload/My.app/', mode: DIR},
    {name: 'Payload/My.app/My', data: bigRandom, mode: EXEC},
    {name: 'Payload/My.app/Info.plist', data: bigText, mode: FILE},
    {name: 'Payload/My.app/empty.txt', data: '', mode: FILE},
    {name: 'Payload/My.app/\u00e9\u65e5\u672c.txt', data: 'unicode', mode: FILE, method: 0},
    {name: 'Payload/My.app/Frameworks/F.framework/Versions/A/F', data: bigRandom.subarray(0, 4000), mode: EXEC},
    {name: 'Payload/My.app/Frameworks/F.framework/Versions/Current', data: 'A', mode: LINK},
    {name: 'Payload/My.app/Frameworks/F.framework/F', data: 'Versions/Current/F', mode: LINK},
    {name: '__MACOSX/Payload/._My', data: 'ignored', mode: FILE},
  ];
}

/**
 * Registers a temporary folder for every test of the enclosing suite.
 *
 * @returns The folders of the current test, and helpers to extract archives into them
 */
export function useStreamFixtures() {
  const folders = {tmpRoot: '', out: ''};

  beforeEach(async function () {
    folders.tmpRoot = await fs.realpath(await tempDir.openDir());
    folders.out = path.join(folders.tmpRoot, 'out');
  });

  afterEach(async function () {
    await fs.rimraf(folders.tmpRoot);
  });

  /** Extracts in-memory archive bytes and returns the snapshot of the result */
  async function extractBuffer(data: Buffer, sizes: number[] = [64 * 1024], opts?: zip.ExtractStreamOptions) {
    await fs.rimraf(folders.out);
    const result = await zip.extractStreamTo(chunked(data, sizes), folders.out, opts);
    return {result, tree: await snapshot(folders.out, {modes: !isWindows()})};
  }

  /** The reference result of the seekable extractor */
  async function referenceTree(data: Buffer) {
    const archive = path.join(folders.tmpRoot, 'reference.zip');
    const refOut = path.join(folders.tmpRoot, 'reference');
    await fs.writeFile(archive, data);
    await fs.rimraf(refOut);
    await zip.extractAllTo(archive, refOut, {fileNamesEncoding: 'utf8'});
    return await snapshot(refOut, {modes: !isWindows()});
  }

  return {folders, extractBuffer, referenceTree};
}
