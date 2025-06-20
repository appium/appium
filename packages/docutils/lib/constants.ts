/**
 * Constants used across various modules in this package
 * @module
 */

const {LogLevels} = require('consola');
import {fs} from '@appium/support';
import path from 'node:path';

/**
 * CLI executable name
 */
export const NAME_BIN = 'appium-docs';

/**
 * Expected name of the `mkdocs.yml` config file
 */
export const NAME_MKDOCS_YML = 'mkdocs.yml';

/**
 * `python` executable
 */
export const NAME_PYTHON = 'python';
/**
 * It's `package.json`!
 */
export const NAME_PACKAGE_JSON = 'package.json';
/**
 * Name of the `requirements.txt` file for `pip`
 */
export const NAME_REQUIREMENTS_TXT = 'requirements.txt';
/**
 * Name of the `$schema` property which can be present in JSON files; it may need to be removed to
 * avoid warnings/errors by 3p libs
 */
export const NAME_SCHEMA = '$schema';
/**
 * Name of the `mkdocs` executable
 */
export const NAME_MKDOCS = 'mkdocs';

/**
 * Name of the `mike` executable
 */
export const NAME_MIKE = 'mike';

/**
 * Name of the `pip` module.
 *
 * @remarks We don't execute the `pip` executable; but rather use `python -m pip` since that seems
 * to work better ... on my computer.
 */
export const NAME_PIP = 'pip';

/**
 * Code for a "file not found" error
 */
export const NAME_ERR_ENOENT = 'ENOENT';

/**
 * Name of the default theme
 */
export const NAME_THEME = 'material';

/**
 * Default log level
 */
export const DEFAULT_LOG_LEVEL = 'info';
/**
 * Blocking I/O
 */
export const PKG_ROOT_DIR = fs.findRoot(__dirname);

/**
 * Path to the `requirements.txt` file (in this package)
 */

export const REQUIREMENTS_TXT_PATH = path.join(PKG_ROOT_DIR, NAME_REQUIREMENTS_TXT);

/**
 * The default alias creation strategy to pass to `mike` when deploying
 * (`symlink`, `redirect` or `copy`)
 */
export const DEFAULT_DEPLOY_ALIAS_TYPE = 'symlink';

/**
 * The default branch to deploy to
 */
export const DEFAULT_DEPLOY_BRANCH = 'gh-pages';

/**
 * The default remote to push the deployed branch to
 */
export const DEFAULT_DEPLOY_REMOTE = 'origin';

/**
 * The default port for serving docs
 */
export const DEFAULT_SERVE_PORT = 8000;

/**
 * The default host for serving docs
 */
export const DEFAULT_SERVE_HOST = 'localhost';

/**
 * Mapping of `@appium/docutils`' log levels to `consola` log levels
 */
export const LogLevelMap = {
  silent: LogLevels.silent,
  error: LogLevels.error,
  warn: LogLevels.warn,
  info: LogLevels.info,
  debug: LogLevels.debug,
} as const;

/**
 * If the user does not specify a site directory _and_ the `mkdocs.yml` doesn't either, use this dir.
 */
export const DEFAULT_SITE_DIR = 'site';

/**
 * pip 23.0 implements PEP 668, which may prevent overriding Python system packages
 * unless the --break-system-packages flag is passed.
 * To ensure backwards compatibility, its environment variable version is used
 */
export const PIP_ENV_VARS = {PIP_BREAK_SYSTEM_PACKAGES: '1'};

/**
 * Error message emitted when the path to Python was not found
 */
export const MESSAGE_PYTHON_MISSING = 'Could not find Python in PATH. Is it installed?';
