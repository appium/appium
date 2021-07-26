import _ from 'lodash';
import { validateCaps } from './capabilities';

function parseKnownArgs (serverArgs, argsConstraints) {
  const knownArgNames = Object.keys(argsConstraints);
  return _.toPairs(serverArgs).reduce((args, [argName, argValue]) => {
    if (knownArgNames.includes(argName)) {
      args[argName] = argValue;
    } else {
      const knownArgs = Object.keys(argsConstraints);
      throw new Error(`"${argName}" is not a recognized key are you sure it's in the list ` +
                      `of supported keys? ${JSON.stringify(knownArgs)}`);
    }
    return args;
  }, {});
}

/**
 * Takes in a set of opts, server args passed in by user, and arg constraints
 * to parse for, and returns a combined object containing opts
 * and parsed server args. If serverArgs or argsConstraints is empty, opts is returned
 * back
 *
 * @param {object} opts - driver opts
 * @param {object} serverArgs - serverArgs
 * @param {object} argsConstraints - Constraints for arguments
 * @return {object}
*/
function parseServerArgs (opts, serverArgs, argsConstraints) {
  if (_.isEmpty(serverArgs) || _.isEmpty(argsConstraints)) {
    return opts;
  } else {
    let args = parseKnownArgs(serverArgs, argsConstraints);
    args = validateCaps(args, argsConstraints);
    return _.assign(opts, args);
  }
}

export {
  parseServerArgs
};