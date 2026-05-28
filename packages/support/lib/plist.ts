import {build as plistBuild, parse as plistParse} from 'plist';
import bplistCreate from 'bplist-creator';
import {parseFile, parseBuffer} from 'bplist-parser';
import {fs} from './fs';
import log from './logger';
import {truncateString} from './util';

const BPLIST_IDENTIFIER = {
  BUFFER: Buffer.from('bplist00'),
  TEXT: 'bplist00',
};
const PLIST_IDENTIFIER = {
  BUFFER: Buffer.from('<'),
  TEXT: '<',
};

/**
 * Parses a file in xml or binary format of plist
 *
 * @param plist - The plist file path
 * @param mustExist - If set to false, this method will return an empty object when the file doesn't exist
 * @param quiet - If set to false, the plist path will be logged in debug level
 * @returns Parsed plist as a JS object
 */
export async function parsePlistFile(
  plist: string,
  mustExist = true,
  quiet = true
): Promise<object> {
  if (!(await fs.exists(plist))) {
    if (mustExist) {
      throw log.errorWithException(`Plist file doesn't exist: '${plist}'`);
    }
    if (!quiet) {
      log.debug(`Plist file '${plist}' does not exist. Returning an empty plist.`);
    }
    return {};
  }

  let obj: object;
  let type = 'binary';
  try {
    const parsed = await parseFile(plist);
    if (parsed.length) {
      obj = parsed[0];
    } else {
      throw new Error(`Binary file '${plist}' appears to be empty`);
    }
  } catch {
    try {
      obj = await parseXmlPlistFile(plist);
      type = 'xml';
    } catch (err) {
      throw log.errorWithException(
        `Could not parse plist file '${plist}' as XML: ${(err as Error).message}`
      );
    }
  }

  if (!quiet) {
    log.debug(`Parsed plist file '${plist}' as ${type}`);
  }
  return obj;
}

/**
 * Updates a plist file with the given fields
 *
 * @param plist - The plist file path
 * @param updatedFields - The updated fields-value pairs
 * @param binary - If set to false, the file will be created as a xml plist
 * @param mustExist - If set to false, this method will update an empty plist
 * @param quiet - If set to false, the plist path will be logged in debug level
 */
export async function updatePlistFile(
  plist: string,
  updatedFields: object,
  binary = true,
  mustExist = true,
  quiet = true
): Promise<void> {
  let obj: object;
  try {
    obj = await parsePlistFile(plist, mustExist);
  } catch (err) {
    throw log.errorWithException(`Could not update plist: ${(err as Error).message}`);
  }
  Object.assign(obj as Record<string, unknown>, updatedFields);
  const newPlist = binary ? bplistCreate(obj) : plistBuild(obj);
  try {
    await fs.writeFile(plist, newPlist);
  } catch (err) {
    throw log.errorWithException(`Could not save plist: ${(err as Error).message}`);
  }
  if (!quiet) {
    log.debug(`Wrote plist file '${plist}'`);
  }
}

/**
 * Creates a binary plist Buffer from an object
 *
 * @param data - The object to be turned into a binary plist
 * @returns Plist in the form of a binary buffer
 */
export function createBinaryPlist(data: object): Buffer {
  return bplistCreate(data);
}

/**
 * Parses a Buffer into an Object
 *
 * @param data - The buffer of a binary plist
 * @returns Array of parsed root objects (typically one element)
 */
export function parseBinaryPlist(data: Buffer): object[] {
  return parseBuffer(data);
}

/**
 * Creates a plist from an object
 *
 * @param object - The JS object to be turned into a plist
 * @param binary - Set it to true for a binary plist
 * @returns A buffer or a string depending on the binary parameter
 */
export function createPlist(object: object, binary = false): Buffer | string {
  if (binary) {
    return createBinaryPlist(object);
  }
  return plistBuild(object);
}

/**
 * Parses a buffer or string into a JS object
 *
 * @param data - The plist as a string, Buffer, Uint8Array, or ArrayBuffer
 * @returns Parsed plist as a JS object
 * @throws Will throw an error if the plist type is unknown
 */
export function parsePlist(data: string | Buffer | Uint8Array | ArrayBuffer): object {
  const textPlist = getXmlPlist(data);
  if (textPlist) {
    return plistParse(textPlist);
  }

  const binaryPlist = getBinaryPlist(data);
  if (binaryPlist) {
    return parseBinaryPlist(binaryPlist)[0];
  }

  throw new Error(
    `Unknown type of plist, data: ${truncateString(data.toString(), {length: 200})}`
  );
}

async function parseXmlPlistFile(plistFilename: string): Promise<object> {
  const xmlContent = await fs.readFile(plistFilename, 'utf8');
  return plistParse(xmlContent);
}

function getXmlPlist(data: string | Buffer | Uint8Array | ArrayBuffer): string | null {
  if (typeof data === 'string' && data.startsWith(PLIST_IDENTIFIER.TEXT)) {
    return data;
  }
  const binaryData = toBufferIfBinaryLike(data);
  if (
    binaryData &&
    PLIST_IDENTIFIER.BUFFER.compare(binaryData, 0, PLIST_IDENTIFIER.BUFFER.length) === 0
  ) {
    return binaryData.toString();
  }
  return null;
}

function getBinaryPlist(data: string | Buffer | Uint8Array | ArrayBuffer): Buffer | null {
  if (typeof data === 'string' && data.startsWith(BPLIST_IDENTIFIER.TEXT)) {
    return Buffer.from(data);
  }

  const binaryData = toBufferIfBinaryLike(data);
  if (
    binaryData &&
    BPLIST_IDENTIFIER.BUFFER.compare(binaryData, 0, BPLIST_IDENTIFIER.BUFFER.length) === 0
  ) {
    return binaryData;
  }
  return null;
}

function toBufferIfBinaryLike(data: unknown): Buffer | null {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  return null;
}
