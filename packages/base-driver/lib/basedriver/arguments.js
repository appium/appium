import _ from 'lodash';
import { validateCaps } from './capabilities';

function parseKnownArgs (serverArgs, knownArgNames, argsConstraints) {
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
 * Takes in a set of opts, server args passed in by user, arg names to parse for,
 * arg constraints for the arg names, and returns a combined object containing opts
 * and parsed server args
 *
 * @param {object} opts - driver opts
 * @param {object} serverArgs - serverArgs
 * @param {Array<String>} knownArgNames - argNames to parse for
 * @param {object} argsConstraints - Constraints for argNames
 * @return {object}
*/
function parseServerArgs (opts, serverArgs, knownArgNames, argsConstraints) {
  let args = parseKnownArgs(serverArgs, knownArgNames, argsConstraints);
  args = validateCaps(args, argsConstraints);
  for (let arg in argsConstraints) {
    if (!_.has(args, arg) && _.has(opts, arg)) {
      args[arg] = opts[arg];
    }
  }
  return _.assign(opts, args);
}

export {
  parseServerArgs
};