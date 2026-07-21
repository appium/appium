import fs from 'node:fs';
import path from 'node:path';

/**
 * Default ignore patterns for Appium Oxfmt projects.
 */
export {defineConfig} from 'oxfmt';

export const ignorePatterns = [
  '**/.*',
  '**/build/**',
  '**/fixtures/**',
  '**/*.min.*',
  '**/*.md',
  '**/*.html',
  '**/generated/**',
  '**/*.hbs',
  '**/*mkdocs.{yml,yaml}',
];

/**
 * Appium fallback values for Oxfmt options that can also be supplied by
 * `.editorconfig`. These mirror the monorepo `.editorconfig` and are applied
 * only when no `.editorconfig` is found while resolving from `cwd`.
 *
 * @see https://oxc.rs/docs/guide/usage/formatter/config#editorconfig
 */
export const editorConfigFallbacks = {
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  insertFinalNewline: true,
};

/**
 * Returns whether an `.editorconfig` file exists in `cwd` or any parent
 * directory.
 *
 * @param {string} [cwd]
 * @returns {boolean}
 */
export function hasEditorConfig(cwd = process.cwd()) {
  let dir = path.resolve(cwd);

  while (true) {
    if (fs.existsSync(path.join(dir, '.editorconfig'))) {
      return true;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return false;
    }

    dir = parent;
  }
}

/**
 * Build shared Oxfmt format options for Appium projects.
 *
 * Non-`.editorconfig` options are always set here. Options that Oxfmt can read
 * from `.editorconfig` (`printWidth`, `tabWidth`, `useTabs`, `endOfLine`,
 * `insertFinalNewline`) are omitted when an `.editorconfig` file is present so
 * Oxfmt can apply the file's values (including glob overrides) at format time.
 * When no `.editorconfig` exists, {@link editorConfigFallbacks} are applied
 * instead.
 *
 * @param {string} [cwd]
 * @returns {Record<string, unknown>}
 */
export function createFormatOptions(cwd = process.cwd()) {
  return {
    semi: true,
    singleQuote: true,
    quoteProps: 'as-needed',
    trailingComma: 'all',
    bracketSpacing: false,
    sortImports: true,
    ...(hasEditorConfig(cwd) ? {} : editorConfigFallbacks),
  };
}

/**
 * Shared Oxfmt configuration for Appium projects.
 */
/** @type {Record<string, unknown>} */
const config = {
  ...createFormatOptions(),
  ignorePatterns,
};

export default config;
