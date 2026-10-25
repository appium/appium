import type stream from 'node:stream';
import {promisify} from 'node:util';

import * as yauzl from 'yauzl';

export const openZip = promisify(yauzl.open) as (zipPath: string, options?: yauzl.Options) => Promise<yauzl.ZipFile>;

export type OpenReadStreamFn = (
  entry: yauzl.Entry,
  options?: Partial<yauzl.ZipFileOptions>,
) => Promise<stream.Readable>;

/** Creates a promisified `openReadStream` bound to the given archive */
export function createOpenReadStream(zipfile: yauzl.ZipFile): OpenReadStreamFn {
  return promisify(zipfile.openReadStream.bind(zipfile)) as OpenReadStreamFn;
}

/** Decodes the entry name using the given encoding if yauzl has not decoded it */
export function toEntryFileName(entry: yauzl.Entry, encoding?: BufferEncoding): string {
  if (Buffer.isBuffer(entry.fileName)) {
    return entry.fileName.toString(encoding ?? 'utf8');
  }
  return entry.fileName;
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
