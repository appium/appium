import type stream from 'node:stream';
import {promisify} from 'node:util';
import zlib from 'node:zlib';

import * as yauzl from 'yauzl';

const FLAG_UTF8_NAME = 0x800;
const EXTRA_UNICODE_PATH = 0x7075;

export const openZip = promisify(yauzl.open) as (zipPath: string, options?: yauzl.Options) => Promise<yauzl.ZipFile>;

export type OpenReadStreamFn = (
  entry: yauzl.Entry,
  options?: Partial<yauzl.ZipFileOptions>,
) => Promise<stream.Readable>;

/** Creates a promisified `openReadStream` bound to the given archive */
export function createOpenReadStream(zipfile: yauzl.ZipFile): OpenReadStreamFn {
  return promisify(zipfile.openReadStream.bind(zipfile)) as OpenReadStreamFn;
}

/**
 * Decodes the entry name if yauzl has not done it: the Info-ZIP unicode path field wins,
 * then the UTF-8 flag, then the given encoding.
 */
export function toEntryFileName(entry: yauzl.Entry, encoding: BufferEncoding = 'utf8'): string {
  const rawName = entry.fileName;
  if (!Buffer.isBuffer(rawName)) {
    return rawName;
  }
  // Only valid if made for this very name
  const unicodePath = entry.extraFields?.find(
    ({id, data}) =>
      id === EXTRA_UNICODE_PATH && data.length > 5 && data[0] === 1 && data.readUInt32LE(1) === zlib.crc32(rawName),
  );
  if (unicodePath) {
    return unicodePath.data.toString('utf8', 5);
  }
  return rawName.toString(entry.generalPurposeBitFlag & FLAG_UTF8_NAME ? 'utf8' : encoding);
}

/**
 * Walk zip entries sequentially (yauzl `lazyEntries` contract).
 */
export async function processYauzlEntriesSequentially(
  zipfile: yauzl.ZipFile,
  onEntry: (entry: yauzl.Entry) => Promise<boolean | void>,
): Promise<void> {
  let queue: Promise<void> = Promise.resolve();
  let stopped = false;

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const settleError = (err: unknown) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };

    const settleSuccess = async () => {
      try {
        await queue;
        if (!settled) {
          settled = true;
          resolve();
        }
      } catch (err) {
        settleError(err);
      }
    };

    zipfile.on('error', settleError);
    zipfile.on('end', () => void settleSuccess());
    zipfile.on('close', () => void settleSuccess());

    zipfile.on('entry', (entry: yauzl.Entry) => {
      queue = queue
        .then(async () => {
          if (stopped) {
            return undefined;
          }
          const shouldContinue = await onEntry(entry);
          if (shouldContinue === false) {
            stopped = true;
            zipfile.close();
            return undefined;
          }
          zipfile.readEntry();
          return undefined;
        })
        .catch((err: unknown) => {
          stopped = true;
          zipfile.close();
          settleError(err);
          return undefined;
        });
    });

    zipfile.readEntry();
  });
}
