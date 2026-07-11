/**
 * Shared Oxlint configuration for Appium projects.
 *
 * Migrated from @appium/eslint-config-appium-ts via @oxlint/migrate.
 * Stylistic rules are intentionally omitted; use oxfmt for formatting.
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
  categories: {
    correctness: 'off',
  },
  options: {
    typeAware: true,
  },
  env: {
    builtin: true,
  },
  ignorePatterns: [
    '**/.*',
    '**/*-d.ts',
    '**/*.min.js',
    '**/build/**',
    '**/coverage/**',
  ],
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
      rules: {
        // --- ESLint recommended (js/recommended) ---
        'constructor-super': 'error',
        'for-direction': 'error',
        'getter-return': 'error',
        'no-async-promise-executor': 'error',
        'no-case-declarations': 'error',
        'no-class-assign': 'error',
        'no-compare-neg-zero': 'error',
        'no-cond-assign': 'error',
        'no-const-assign': 'error',
        'no-constant-binary-expression': 'error',
        'no-constant-condition': 'error',
        'no-control-regex': 'error',
        'no-debugger': 'error',
        'no-delete-var': 'error',
        'no-dupe-class-members': 'error',
        'no-dupe-else-if': 'error',
        'no-dupe-keys': 'error',
        'no-duplicate-case': 'error',
        'no-empty': 'off',
        'no-empty-character-class': 'error',
        'no-empty-pattern': 'error',
        'no-empty-static-block': 'error',
        'no-ex-assign': 'error',
        'no-extra-boolean-cast': 'error',
        'no-fallthrough': 'error',
        'no-func-assign': 'error',
        'no-global-assign': 'error',
        'no-import-assign': 'error',
        'no-invalid-regexp': 'error',
        'no-irregular-whitespace': 'error',
        'no-loss-of-precision': 'error',
        'no-misleading-character-class': 'error',
        'no-new-native-nonconstructor': 'error',
        'no-nonoctal-decimal-escape': 'error',
        'no-obj-calls': 'error',
        'no-prototype-builtins': 'warn',
        'no-redeclare': 'error',
        'no-regex-spaces': 'error',
        'no-self-assign': 'error',
        'no-setter-return': 'error',
        'no-shadow-restricted-names': 'error',
        'no-sparse-arrays': 'error',
        'no-this-before-super': 'error',
        'no-unassigned-vars': 'warn',
        'no-undef': 'error',
        'no-unexpected-multiline': 'off',
        'no-unreachable': 'error',
        'no-unsafe-finally': 'error',
        'no-unsafe-negation': 'error',
        'no-unsafe-optional-chaining': 'error',
        'no-unused-labels': 'error',
        'no-unused-private-class-members': 'error',
        'no-unused-vars': 'warn',
        'no-useless-assignment': 'warn',
        'no-useless-backreference': 'error',
        'no-useless-catch': 'error',
        'no-useless-escape': 'error',
        'no-with': 'error',
        'preserve-caught-error': 'warn',
        'require-yield': 'error',
        'use-isnan': 'error',
        'valid-typeof': 'error',

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
        'no-unused-expressions': 'error',
        'typescript/ban-ts-comment': [
          'warn',
          {
            'ts-expect-error': 'allow-with-description',
            'ts-ignore': 'allow-with-description',
          },
        ],
        'typescript/no-duplicate-enum-values': 'error',
        'typescript/no-empty-object-type': 'off',
        'typescript/no-explicit-any': 'off',
        'typescript/no-extra-non-null-assertion': 'error',
        'typescript/no-misused-new': 'error',
        'typescript/no-namespace': 'error',
        'typescript/no-non-null-asserted-optional-chain': 'error',
        'typescript/no-require-imports': 'off',
        'typescript/no-this-alias': 'error',
        'typescript/no-unnecessary-type-constraint': 'error',
        'typescript/no-unsafe-declaration-merging': 'error',
        'typescript/no-unsafe-function-type': 'error',
        'typescript/no-wrapper-object-types': 'error',
        'typescript/prefer-as-const': 'error',
        'typescript/prefer-namespace-keyword': 'error',
        'typescript/triple-slash-reference': 'error',
        'typescript/consistent-type-imports': [
          'warn',
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
        'unicorn/prefer-node-protocol': 'warn',

        // eslint-config-prettier disables (kept for parity with legacy config)
        'unicorn/empty-brace-spaces': 'off',
        'unicorn/no-nested-ternary': 'off',
        'unicorn/number-literal-case': 'off',
      },
    },
    {
      files: ['**/*.{ts,tsx,mtsx}'],
      plugins: ['typescript'],
      rules: {
        'typescript/no-floating-promises': 'warn',
      },
    },
    {
      files: ['**/test/**', '*.spec.*js', '-specs.*js', '*.spec.ts'],
      plugins: ['typescript', 'import'],
      rules: {
        'no-unused-expressions': 'off',
        'import/no-named-as-default-member': 'off',
        'typescript/ban-ts-comment': 'off',
        'typescript/no-non-null-assertion': 'off',
        'typescript/no-floating-promises': 'off',
      },
    },
  ],
};

export default config;
