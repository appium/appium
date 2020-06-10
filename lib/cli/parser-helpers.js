import fs from 'fs';
import _ from 'lodash';
import { INSTALL_TYPES } from '../driver-config';

// serverArgs will be added to the `server` (default) subcommand
function parseSecurityFeatures (features) {
  const splitter = (splitOn, str) => `${str}`.split(splitOn).map((s) => s.trim()).filter(Boolean);
  let parsedFeatures;
  try {
    parsedFeatures = splitter(',', features);
  } catch (err) {
    throw new Error('Could not parse value of --allow/deny-insecure. Should be ' +
                    'a list of strings separated by commas, or a path to a file ' +
                    'listing one feature name per line.');
  }

  if (parsedFeatures.length === 1 && fs.existsSync(parsedFeatures[0])) {
    // we might have a file which is a list of features
    try {
      const fileFeatures = fs.readFileSync(parsedFeatures[0], 'utf8');
      parsedFeatures = splitter('\n', fileFeatures);
    } catch (err) {
      throw new Error(`Attempted to read --allow/deny-insecure feature names ` +
                      `from file ${parsedFeatures[0]} but got error: ${err.message}`);
    }
  }

  return parsedFeatures;
}

function parseDefaultCaps (caps) {
  try {
    // use synchronous file access, as `argparse` provides no way of either
    // awaiting or using callbacks. This step happens in startup, in what is
    // effectively command-line code, so nothing is blocked in terms of
    // sessions, so holding up the event loop does not incur the usual
    // drawbacks.
    if (fs.statSync(caps).isFile()) {
      caps = fs.readFileSync(caps, 'utf8');
    }
  } catch (err) {
    // not a file, or not readable
  }
  caps = JSON.parse(caps);
  if (!_.isPlainObject(caps)) {
    throw 'Invalid format for default capabilities';
  }
  return caps;
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
  parseDefaultCaps,
  parseInstallTypes,
};
