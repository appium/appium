/**
 * Handles reading of a config file for docutils
 * @module
 */

import loadTs from '@sliphua/lilconfig-ts-loader';
import {lilconfig, Loader} from 'lilconfig';
import _ from 'lodash';
import path from 'node:path';
import YAML from 'yaml';
import parser from 'yargs-parser';
import {hideBin} from 'yargs/helpers';
import {DEFAULT_LOG_LEVEL, LogLevelMap, NAME_BIN} from '../constants';
import {getLogger, initLogger, isLogLevelString} from '../logger';
import {relative} from '../util';

const log = getLogger('config');

/**
 * `lilconfig` loader for YAML
 */
const loadYaml: Loader = _.rearg(YAML.parse, [2, 0, 1]);
/**
 * `lilconfig` loader for ESM/CJS
 */
const loadEsm: Loader = (filepath: string) => import(filepath);

/**
 * Controls how we load/find a config file.
 *
 * Takes _raw_ args from the CLI, and uses `yargs-parser` to parse them as to not interfere with the
 * main usage of args.
 *
 * We're looking for various things in the CLI args:
 * - `--no-config` - if this is present, we don't load a config file
 * - `--log-level` - if this is present, we set the log level
 * - `--verbose` - same as above
 * - `--config` - if this is present, we load the config file at the given path
 * - `--help`, `--version` - do nothing
 * @param argv Raw CLI args
 * @returns
 */
export async function findConfig(argv: string[] = hideBin(process.argv)) {
  const preArgs = parser(argv);

  // if --verbose is used, set the log level to debug.
  // otherwise use --log-level or the default.
  let logLevel: keyof typeof LogLevelMap;
  if (preArgs.verbose) {
    logLevel = 'debug';
  } else {
    // if the loglevel is valid, use it, otherwise use the default
    logLevel = isLogLevelString(preArgs.logLevel) ? preArgs.logLevel : DEFAULT_LOG_LEVEL;
  }
  initLogger(logLevel);

  if (preArgs.noConfig) {
    log.debug('Not loading config because --no-config was provided');
  }

  return preArgs.noConfig || preArgs.help || preArgs.version
    ? {}
    : await loadConfig(preArgs.config as string | undefined);
}

/**
 * Loads a config file or finds and loads one if none provided
 * @param filepath Config file path, if provided
 * @param cwd Current working directory
 * @returns A config object or an empty object. Could be anything; `yargs` will validate it.
 */
export async function loadConfig(filepath?: string, cwd = process.cwd()): Promise<any> {
  const relativePath = relative(cwd);
  const searcher = lilconfig(NAME_BIN, {
    loaders: {
      '.yaml': loadYaml,
      '.yml': loadYaml,
      '.ts': loadTs,
      '.js': loadEsm,
      '.cjs': loadEsm,
      '.mjs': loadEsm,
    },
  });

  const result = filepath
    ? await searcher.load(path.normalize(filepath))
    : await searcher.search(cwd);
  if (result === null) {
    log.debug('No config found');
    return {};
  }
  if (result.isEmpty) {
    log.debug('Config loaded at %s but it was empty', result.filepath);
    return {};
  }
  const relFilepath = relativePath(result.filepath);
  log.success('Loaded config from %s', relFilepath);
  log.debug('Config contents: %O', result.config);
  return result.config;
}
