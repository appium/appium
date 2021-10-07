import fs from 'fs';
import _ from 'lodash';
import { INSTALL_TYPES } from '../extension-config';

// serverArgs will be added to the `server` (default) subcommand
function parseSecurityFeatures (features) {
  let parsedFeatures;
  const splitter = (splitOn, str) => `${str}`.split(splitOn)
    .map((s) => s.trim())
    .filter(Boolean);
  if (_.isString(features)) {
    try {
      parsedFeatures = splitter(',', features);
    } catch (err) {
      throw new TypeError('Could not parse value of --allow/deny-insecure. Should be ' +
        'a list of strings separated by commas, or a path to a file ' +
        'listing one feature name per line.');
    }
  } else {
    // it's an array
    parsedFeatures = features;
  }

  if (parsedFeatures.length === 1 && fs.existsSync(parsedFeatures[0])) {
    // we might have a file which is a list of features
    try {
      const fileFeatures = fs.readFileSync(parsedFeatures[0], 'utf8');
      parsedFeatures = splitter('\n', fileFeatures);
    } catch (err) {
      throw new TypeError(`Attempted to read --allow/deny-insecure feature names ` +
        `from file ${parsedFeatures[0]} but got error: ${err.message}`);
    }
  }

  return parsedFeatures;
}

function parseDriverNames (names) {
  if (!_.isString(names)) {
    throw new TypeError('To parse driver names, names must be a CSV string');
  }

  try {
    return names.split(',').map((s) => s.trim()).filter(Boolean);
  } catch (err) {
    throw new TypeError('Could not parse value of --drivers. Should be a list of driver names ' +
                    'separated by commas. Driver names are those found when running `appium ' +
                    'driver list`');
  }
}

function parsePluginNames (names) {
  if (!_.isString(names)) {
    throw new TypeError('To parse plugin names, names must be a CSV string');
  }

  try {
    return names.split(',').map((s) => s.trim()).filter(Boolean);
  } catch (err) {
    throw new TypeError('Could not parse value of --plugins. Should be a list of plugin names ' +
                    'separated by commas. Plugin names are those found when running `appium ' +
                    'plugin list`');
  }
}

function parseJsonStringOrFile (capsOrPath) {
  let caps = capsOrPath;
  let loadedFromFile = false;
  try {
    // use synchronous file access, as `argparse` provides no way of either
    // awaiting or using callbacks. This step happens in startup, in what is
    // effectively command-line code, so nothing is blocked in terms of
    // sessions, so holding up the event loop does not incur the usual
    // drawbacks.
    if (_.isString(capsOrPath) && fs.statSync(capsOrPath).isFile()) {
      caps = fs.readFileSync(capsOrPath, 'utf8');
      loadedFromFile = true;
    }
  } catch (err) {
    // not a file, or not readable
  }
  try {
    const result = JSON.parse(caps);
    if (!_.isPlainObject(result)) {
      throw new Error(`'${_.truncate(result, {length: 100})}' is not an object`);
    }
    return result;
  } catch (e) {
    const msg = loadedFromFile
      ? `The provided value of '${capsOrPath}' must be a valid JSON`
      : `The provided value must be a valid JSON`;
    throw new TypeError(`${msg}. Original error: ${e.message}`);
  }
}

function parseInstallTypes (source) {
  if (!_.includes(INSTALL_TYPES, source)) {
    throw `Argument to --source was '${source}', which is not a valid ` +
          `driver source type. It must be one of ${JSON.stringify(INSTALL_TYPES)}`;
  }

  return source;
}

export {
  parseSecurityFeatures,
  parseJsonStringOrFile,
  parseInstallTypes,
  parsePluginNames,
  parseDriverNames,
};
