/**
 * Default ignore patterns for Appium Oxfmt projects.
 */
export const fmtIgnorePatterns = [
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
 * Shared Oxfmt configuration for Appium projects.
 *
 * Format options are synced with the monorepo `.editorconfig`.
 */
/** @type {Record<string, unknown>} */
const config = {
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  bracketSpacing: false,
  sortImports: true,
  ignorePatterns: fmtIgnorePatterns,
};

export default config;
