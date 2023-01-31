/**
 * Constants used across various modules in this package
 * @module
 */

import {readFileSync} from 'node:fs';
import {fs} from '@appium/support';
import path from 'node:path';
import {PackageJson} from 'type-fest';

export const NAME_BIN = 'appium-docs';
export const NAME_MKDOCS_YML = 'mkdocs.yml';
export const NAME_TSCONFIG_JSON = 'tsconfig.json';
export const NAME_PYTHON = 'python';
export const NAME_TYPEDOC_JSON = 'typedoc.json';
export const NAME_PACKAGE_JSON = 'package.json';
export const NAME_REQUIREMENTS_TXT = 'requirements.txt';

export const NAME_SCHEMA = '$schema';
export const NAME_MKDOCS = 'mkdocs';
export const NAME_PIP = 'pip';

export const NAME_NPM = 'npm';

export const DEFAULT_LOG_LEVEL = 'info';
/**
 * Blocking I/O
 */
export const PKG_ROOT_DIR = fs.findRoot(__dirname);
/**
 * Blocking I/O
 */

export const DOCUTILS_PKG: PackageJson = JSON.parse(
  readFileSync(path.join(PKG_ROOT_DIR, NAME_PACKAGE_JSON), 'utf8')
);

/**
 * Path to the `requirements.txt` file (in this package)
 */

export const REQUIREMENTS_TXT_PATH = path.join(PKG_ROOT_DIR, NAME_REQUIREMENTS_TXT);

/**
 * The default output path for Typedoc, computed relative to the consuming package's root
 */
export const DEFAULT_REL_TYPEDOC_OUT_PATH = path.join('docs', 'reference');
