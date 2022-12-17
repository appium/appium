import _ from 'lodash';
import { MODULE_ROOT } from './utils';
import path from 'path';
import { fs } from 'appium/support';
import B from 'bluebird';
import { errors } from 'appium/driver';

export const DEFAULT_LANG = 'eng';
export const LANG_EXT_GZ = '.traineddata.gz';
export const LANG_EXT = '.traineddata';
export const LANGS_ROOT = path.resolve(MODULE_ROOT, 'languages');
const LANG_FILES_LOCATION = 'https://github.com/naptha/tessdata';

/**
 * Check if the given traineddata language file exists in the given folder
 *
 * @param {string} root Full path to the root folder
 * @param {string} name Language name
 * @returns {boolean} True if the language file exists
 */
async function languageExists (root, name) {
  return _.some(await B.all([
    `${name}${LANG_EXT}`,
    `${name}${LANG_EXT_GZ}`,
  ].map(
    (n) => fs.exists(path.resolve(root, n))
  )));
}

/**
 * Verifies whether trained data files are present for the give
 * language names. Language names are assumed to be the same as file names.
 *
 * @param {string} root Full path to the folder where .traineddata.gz files are stored
 * @param {string} names One or more language names separated by '+'
 * @returns {Promise<string>} The same input string
 * @throws {Error} If a data file is missing for  any of the given language names
 */
export async function requireLanguages (root, names) {
  const namesArr = _.trim(names).split('+');
  if (_.isEmpty(namesArr)) {
    throw new errors.InvalidArgumentError('Languages list must not be empty');
  }

  const existence = await B.all(namesArr.map((n) => languageExists(root, n)));
  const pairs = _.zip(namesArr, existence);
  const nonExistingNames = pairs.filter(([, lExists]) => !lExists).map(([lName,]) => lName);
  if (!_.isEmpty(nonExistingNames)) {
    throw new errors.InvalidArgumentError(
      `The trained data is missing for the following requested languages: ${nonExistingNames}. ` +
      `Consider downloading corresponding ${LANG_EXT} or ${LANG_EXT_GZ} files from ${LANG_FILES_LOCATION} `
      `and putting them into '${LANGS_ROOT}' folder.`
    );
  }
  return names;
}
