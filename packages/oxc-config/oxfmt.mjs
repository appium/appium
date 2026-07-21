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
 * `.editorconfig`. These mirror the monorepo `.editorconfig`.
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

/** @type {Record<keyof typeof editorConfigFallbacks, string>} */
const editorConfigOptionKeys = {
  printWidth: 'max_line_length',
  tabWidth: 'indent_size',
  useTabs: 'indent_style',
  endOfLine: 'end_of_line',
  insertFinalNewline: 'insert_final_newline',
};

/**
 * @param {string} cwd
 * @returns {string | null}
 */
function findEditorConfig(cwd) {
  let dir = path.resolve(cwd);

  while (true) {
    const file = path.join(dir, '.editorconfig');
    if (fs.existsSync(file)) {
      return file;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }

    dir = parent;
  }
}

/**
 * @param {string} filePath
 * @returns {Set<string>}
 */
function parseEditorConfigDefinedKeys(filePath) {
  /** @type {Set<string>} */
  const definedKeys = new Set();

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    definedKeys.add(trimmed.slice(0, separatorIndex).trim().toLowerCase());
  }

  return definedKeys;
}

/**
 * Returns Appium fallbacks only for Oxfmt options not defined anywhere in the
 * nearest ancestor `.editorconfig`.
 *
 * Options that are defined in `.editorconfig` are left unset so Oxfmt can
 * still apply section-specific values (including glob overrides) at format time.
 *
 * @param {string} [cwd]
 * @returns {Partial<typeof editorConfigFallbacks>}
 */
export function resolveEditorConfigFallbacks(cwd = process.cwd()) {
  const filePath = findEditorConfig(cwd);
  if (!filePath) {
    return {...editorConfigFallbacks};
  }

  const definedKeys = parseEditorConfigDefinedKeys(filePath);
  /** @type {Partial<typeof editorConfigFallbacks>} */
  const fallbacks = {};

  for (const [oxfmtKey, ecKey] of Object.entries(editorConfigOptionKeys)) {
    if (!definedKeys.has(ecKey)) {
      fallbacks[/** @type {keyof typeof editorConfigFallbacks} */ (oxfmtKey)] =
        editorConfigFallbacks[/** @type {keyof typeof editorConfigFallbacks} */ (oxfmtKey)];
    }
  }

  return fallbacks;
}

/**
 * Returns whether an `.editorconfig` file exists in `cwd` or any parent
 * directory.
 *
 * @param {string} [cwd]
 * @returns {boolean}
 */
export function hasEditorConfig(cwd = process.cwd()) {
  return findEditorConfig(cwd) !== null;
}

/**
 * Build shared Oxfmt format options for Appium projects.
 *
 * Non-`.editorconfig` options are always set here. Options that Oxfmt can read
 * from `.editorconfig` use {@link editorConfigFallbacks} only when that file
 * does not define the corresponding property; otherwise they stay unset so
 * Oxfmt can apply the file's values (including glob overrides) at format time.
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
    ...resolveEditorConfigFallbacks(cwd),
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
