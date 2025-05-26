import xmlplist from 'plist';
import bplistCreate from 'bplist-creator';
import bplistParse from 'bplist-parser';
import {fs} from './fs';
import log from './logger';
import _ from 'lodash';

const BPLIST_IDENTIFIER = {
  BUFFER: Buffer.from('bplist00'),
  TEXT: 'bplist00',
};
const PLIST_IDENTIFIER = {
  BUFFER: Buffer.from('<'),
  TEXT: '<',
};

// XML Plist library helper
async function parseXmlPlistFile(plistFilename) {
  let xmlContent = await fs.readFile(plistFilename, 'utf8');
  return xmlplist.parse(xmlContent);
}

/**
 * Parses a file in xml or binary format of plist
 * @param {string} plist The plist file path
 * @param {boolean} mustExist If set to false, this method will return an empty object when the file doesn't exist
 * @param {boolean} quiet If set to false, the plist path will be logged in debug level
 * @returns {Promise<any>} parsed plist JS Object
 */
async function parsePlistFile(plist, mustExist = true, quiet = true) {
  // handle nonexistant file
  if (!(await fs.exists(plist))) {
    if (mustExist) {
      throw log.errorWithException(`Plist file doesn't exist: '${plist}'`);
    } else {
      log.debug(`Plist file '${plist}' does not exist. Returning an empty plist.`);
      return {};
    }
  }

  let obj = {};
  let type = 'binary';
  try {
    obj = await bplistParse.parseFile(plist);
    if (obj.length) {
      obj = obj[0];
    } else {
      throw new Error(`Binary file '${plist}'' appears to be empty`);
    }
  } catch {
    try {
      obj = await parseXmlPlistFile(plist);
      type = 'xml';
    } catch (err) {
      throw log.errorWithException(`Could not parse plist file '${plist}' as XML: ${err.message}`);
    }
  }

  if (!quiet) {
    log.debug(`Parsed plist file '${plist}' as ${type}`);
  }
  return obj;
}

/**
 * Updates a plist file with the given fields
 * @param {string} plist The plist file path
 * @param {Object} updatedFields The updated fields-value pairs
 * @param {boolean} binary If set to false, the file will be created as a xml plist
 * @param {boolean} mustExist If set to false, this method will update an empty plist
 * @param {boolean} quiet If set to false, the plist path will be logged in debug level
 */
async function updatePlistFile(
  plist,
  updatedFields,
  binary = true,
  mustExist = true,
  quiet = true
) {
  let obj;
  try {
    obj = await parsePlistFile(plist, mustExist);
  } catch (err) {
    throw log.errorWithException(`Could not update plist: ${err.message}`);
  }
  _.extend(obj, updatedFields);
  let newPlist = binary ? bplistCreate(obj) : xmlplist.build(obj);
  try {
    await fs.writeFile(plist, newPlist);
  } catch (err) {
    throw log.errorWithException(`Could not save plist: ${err.message}`);
  }
  if (!quiet) {
    log.debug(`Wrote plist file '${plist}'`);
  }
}
/**
 * Creates a binary plist Buffer from an object
 * @param {Object} data The object to be turned into a binary plist
 * @returns {Buffer} plist in the form of a binary buffer
 */
function createBinaryPlist(data) {
  return bplistCreate(data);
}

/**
 * Parses a Buffer into an Object
 * @param {Buffer} data The buffer of a binary plist
 */
function parseBinaryPlist(data) {
  return bplistParse.parseBuffer(data);
}

function getXmlPlist(data) {
  if (_.isString(data) && data.startsWith(PLIST_IDENTIFIER.TEXT)) {
    return data;
  }
  if (
    _.isBuffer(data) &&
    PLIST_IDENTIFIER.BUFFER.compare(data, 0, PLIST_IDENTIFIER.BUFFER.length) === 0
  ) {
    return data.toString();
  }
  return null;
}

function getBinaryPlist(data) {
  if (_.isString(data) && data.startsWith(BPLIST_IDENTIFIER.TEXT)) {
    return Buffer.from(data);
  }

  if (
    _.isBuffer(data) &&
    BPLIST_IDENTIFIER.BUFFER.compare(data, 0, BPLIST_IDENTIFIER.BUFFER.length) === 0
  ) {
    return data;
  }
  return null;
}

/**
 * Creates a plist from an object
 * @param {Object} object The JS object to be turned into a plist
 * @param {boolean} binary Set it to true for a binary plist
 * @returns {string|Buffer} returns a buffer or a string in respect to the binary parameter
 */
function createPlist(object, binary = false) {
  if (binary) {
    return createBinaryPlist(object);
  } else {
    return xmlplist.build(object);
  }
}

/**
 * Parses an buffer or a string to a JS object a plist from an object
 * @param {string|Buffer} data The plist in the form of string or Buffer
 * @returns {Object} parsed plist JS Object
 * @throws Will throw an error if the plist type is unknown
 */
function parsePlist(data) {
  let textPlist = getXmlPlist(data);
  if (textPlist) {
    return xmlplist.parse(textPlist);
  }

  let binaryPlist = getBinaryPlist(data);
  if (binaryPlist) {
    return parseBinaryPlist(binaryPlist)[0];
  }

  throw new Error(`Unknown type of plist, data: ${data.toString()}`);
}

export {
  parsePlistFile,
  parsePlist,
  createPlist,
  updatePlistFile,
  createBinaryPlist,
  parseBinaryPlist,
};
