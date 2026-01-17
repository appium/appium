import path from 'node:path';
import fs from 'node:fs';

import {includeIgnoreFile} from '@eslint/compat';
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import {defineConfig, globalIgnores} from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import {createTypeScriptImportResolver} from 'eslint-import-resolver-typescript';
import globals from 'globals';
import pluginPromise from 'eslint-plugin-promise';
import {importX} from 'eslint-plugin-import-x';
import mochaPlugin from 'eslint-plugin-mocha';
import nodePlugin from 'eslint-plugin-n';
import {configs as tsConfigs} from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';

const gitignorePath = path.resolve(process.cwd(), '.gitignore');

export default defineConfig([
  {
    name: 'Script Files',
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        NodeJS: 'readonly',
        BufferEncoding: 'readonly',
      },
    },
    plugins: {
      '@stylistic': stylistic,
      'import-x': importX,
      js,
      n: nodePlugin,
      promise: pluginPromise,
      unicorn
    },
    extends: [
      'js/recommended',
      'promise/flat/recommended',
      'import-x/flat/recommended',
      tsConfigs.recommended,
      eslintConfigPrettier,
    ],
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          project: ['tsconfig.json', './packages/*/tsconfig.json'],
        })
      ],
    },
    rules: {
      '@stylistic/array-bracket-spacing': 'error',
      '@stylistic/arrow-parens': 'warn',
      '@stylistic/arrow-spacing': 'error',
      '@stylistic/comma-spacing': 'error',
      '@stylistic/key-spacing': 'error',
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-whitespace-before-property': 'error',
      '@stylistic/quotes': [
        'error',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: 'always',
        },
      ],
      '@stylistic/semi': 'error',
      '@stylistic/space-before-blocks': 'error',
      '@stylistic/space-in-parens': 'error',
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/space-unary-ops': 'error',

      /**
       * This rule is configured to warn if a `@ts-ignore` or `@ts-expect-error` directive is used
       * without explanation.
       * @remarks It's good practice to explain why things break!
       */
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': 'allow-with-description',
        },
      ],
      /**
       * Empty functions are allowed.
       * @remarks This is disabled because I need someone to explain to me why empty functions are bad. I suppose they _could_ be bugs, but so could literally any line of code.
       */
      '@typescript-eslint/no-empty-function': 'off',
      /**
       * Empty interfaces are allowed.
       * @remarks This is because empty interfaces have a use case in declaration merging.  Otherwise,
       * an empty interface can be a type alias, e.g., `type Foo = Bar` where `Bar` is an interface.
       */
      '@typescript-eslint/no-empty-object-type': 'off',
      /**
       * Explicit `any` types are allowed.
       * @remarks Eventually this should be a warning, and finally an error, as we fully type the codebases.
       */
      '@typescript-eslint/no-explicit-any': 'off',
      /**
       * Warns if a non-null assertion (`!`) is used.
       * @remarks Generally, a non-null assertion should be replaced by a proper type guard or
       * type-safe function, if possible. For example, `Set.prototype.has(x)` is not type-safe, and
       * does not imply that `Set.prototype.get(x)` is not `undefined` (I do not know why this is, but
       * I'm sure there's a good reason for it). In this case, a non-null assertion is appropriate.
       * Often a simple `typeof x === 'y'` conditional is sufficient to narrow the type and avoid the
       * non-null assertion.
       */
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      /**
       * Sometimes we want unused variables to be present in base class method declarations.
       */
      '@typescript-eslint/no-unused-vars': 'warn',

      'import-x/named': 'warn',
      'import-x/no-duplicates': 'error',

      'n/no-deprecated-api': 'warn',

      'promise/catch-or-return': 'warn',
      'promise/no-return-wrap': 'warn',
      'promise/prefer-await-to-callbacks': 'warn',
      'promise/prefer-await-to-then': 'warn',
      'promise/param-names': 'warn',

      'arrow-body-style': 'warn',
      'curly': 'error',
      'dot-notation': 'error',
      'eqeqeq': ['error', 'smart'],
      'no-console': 'error',
      'no-empty': 'off',
      'no-prototype-builtins': 'warn',
      'object-shorthand': 'error',
      'radix': 'error',
      'require-atomic-updates': 'off',
      /**
       * Allow `async` functions without `await`.
       * @remarks Originally, this was to be more clear about the return value of a function, but with
       * the addition of types, this is no longer necessary. Further, both `return somePromise` and
       * `return await somePromise` have their own use-cases.
       */
      'require-await': 'off',
      'unicorn/prefer-node-protocol': 'warn'
    }
  },

  {
    name: 'Test Files',
    files: ['**/test/**', '*.spec.*js', '-specs.*js', '*.spec.ts'],
    plugins: {
      mocha: mochaPlugin,
    },
    extends: [mochaPlugin.configs.recommended],
    rules: {
      /**
       * Both `@ts-expect-error` and `@ts-ignore` are allowed to be used with impunity in tests.
       * @remarks We often test things which explicitly violate types.
       */
      '@typescript-eslint/ban-ts-comment': 'off',
      /**
       * Allow non-null assertions in tests; do not even warn.
       * @remarks The idea is that the assertions themselves will be written in such a way that if
       * the non-null assertion was invalid, the assertion would fail.
       */
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'import-x/no-named-as-default-member': 'off',
      'mocha/consistent-spacing-between-blocks': 'off',
      'mocha/max-top-level-suites': 'off',
      'mocha/no-exclusive-tests': 'error',
      'mocha/no-exports': 'off',
      'mocha/no-pending-tests': 'off',
      'mocha/no-setup-in-describe': 'off',
    },
  },
  fs.existsSync(gitignorePath) ? includeIgnoreFile(gitignorePath) : {},
  globalIgnores([
    '**/.*',
    '**/*-d.ts',
    '**/*.min.js',
    '**/build/**',
    '**/coverage/**',
  ]),
]);
