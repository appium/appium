export {defineConfig} from 'oxlint';

/**
 * Default ignore patterns for Appium Oxlint projects.
 *
 * Oxlint does not inherit `ignorePatterns` via `extends`, so import and spread
 * this array in your root config. Oxlint also respects `.gitignore` automatically.
 */
export const ignorePatterns = ['**/.*', '**/*-d.ts', '**/build/**', '**/coverage/**', '**/build-fixtures/**'];

/**
 * Shared Oxlint configuration for Appium projects.
 *
 * Originally migrated from @appium/eslint-config-appium-ts via @oxlint/migrate.
 * Stylistic rules are intentionally omitted; use `@appium/oxc-config/oxfmt` instead.
 *
 * Rules not available in Oxlint (no equivalent yet):
 * - @typescript-eslint/member-ordering
 * - n/no-deprecated-api
 * - jsdoc/require-jsdoc
 * - perfectionist/sort-modules
 */
/** @type {import('oxlint').OxlintConfig} */
const config = {
  plugins: [],
  options: {
    typeAware: true,
  },
  env: {
    builtin: true,
  },
  rules: {
    // --- ESLint recommended (js/recommended) ---
    'no-case-declarations': 'error',
    'no-empty': 'off',
    'no-fallthrough': 'error',
    'no-prototype-builtins': 'warn',
    'no-redeclare': 'error',
    'no-regex-spaces': 'error',
    'no-undef': 'error',
    'no-unexpected-multiline': 'off',
    'no-useless-assignment': 'warn',
    'preserve-caught-error': 'warn',

    // --- eslint-plugin-promise (flat/recommended) ---
    'promise/always-return': 'error',
    'promise/no-return-wrap': 'warn',
    'promise/param-names': 'warn',
    'promise/catch-or-return': 'warn',
    'promise/no-nesting': 'warn',
    'promise/no-promise-in-callback': 'warn',
    'promise/no-callback-in-promise': 'warn',
    'promise/avoid-new': 'off',
    'promise/no-new-statics': 'error',
    'promise/no-return-in-finally': 'warn',
    'promise/valid-params': 'warn',
    'promise/prefer-await-to-callbacks': 'warn',
    'promise/prefer-await-to-then': 'warn',

    // --- eslint-plugin-import-x (flat/recommended) ---
    'import/named': 'warn',
    'import/namespace': 'error',
    'import/default': 'error',
    'import/export': 'error',
    'import/no-named-as-default': 'warn',
    'import/no-named-as-default-member': 'warn',
    'import/no-duplicates': 'error',

    // --- typescript-eslint recommended ---
    'no-array-constructor': 'error',
    'typescript/ban-ts-comment': [
      'warn',
      {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': 'allow-with-description',
      },
    ],
    'typescript/no-empty-object-type': 'off',
    'typescript/no-explicit-any': 'off',
    'typescript/no-namespace': 'error',
    'typescript/no-require-imports': 'off',
    'typescript/no-unnecessary-type-constraint': 'error',
    'typescript/no-unsafe-function-type': 'error',
    'typescript/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports',
      },
    ],
    'typescript/no-non-null-assertion': 'warn',
    'typescript/dot-notation': 'error',

    // --- Appium custom rules ---
    curly: 'error',
    'arrow-body-style': 'warn',
    eqeqeq: ['error', 'smart'],
    'no-console': 'error',
    'object-shorthand': 'error',
    radix: 'error',
    'require-await': 'off',
    'no-empty-function': 'off',
    'typescript/await-thenable': 'off',
    'typescript/unbound-method': 'off',
    'unicorn/prefer-node-protocol': 'warn',

    // eslint-config-prettier disables (kept for parity with legacy config)
    'unicorn/empty-brace-spaces': 'off',
    'unicorn/no-nested-ternary': 'off',
    'unicorn/number-literal-case': 'off',
  },
  overrides: [
    {
      files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
      plugins: ['promise', 'import', 'typescript', 'unicorn'],
      env: {
        es2022: true,
        node: true,
      },
      globals: {
        NodeJS: 'readonly',
        BufferEncoding: 'readonly',
      },
    },
    {
      files: ['**/test/**'],
      plugins: ['typescript', 'import'],
      rules: {
        'no-unused-expressions': 'off',
        'import/no-named-as-default-member': 'off',
        'promise/always-return': 'off',
        'promise/catch-or-return': 'off',
        'promise/no-callback-in-promise': 'off',
        'promise/param-names': 'off',
        'promise/prefer-await-to-callbacks': 'off',
        'promise/prefer-await-to-then': 'off',
        'typescript/ban-ts-comment': 'off',
        'typescript/no-base-to-string': 'off',
        'typescript/no-non-null-assertion': 'off',
        'typescript/no-floating-promises': 'off',
        'typescript/no-useless-default-assignment': 'off',
        'typescript/restrict-template-expressions': 'off',
      },
    },
  ],
};

export default config;
