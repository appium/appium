import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';

import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import pluginPromise from 'eslint-plugin-promise';
import importPlugin from 'eslint-plugin-import';
import mochaPlugin from 'eslint-plugin-mocha';
import {includeIgnoreFile} from '@eslint/compat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

export default [
  js.configs.recommended,
  pluginPromise.configs['flat/recommended'],
  importPlugin.flatConfigs.recommended,

  {
    name: 'Script Files',
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...globals.node,
        NodeJS: 'readonly',
        BufferEncoding: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    settings: {
      /**
      * This stuff enables `eslint-plugin-import` to resolve TS modules.
      */
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx', '.mtsx'],
      },
      'import/resolver': {
        typescript: {
          project: ['tsconfig.json', './packages/*/tsconfig.json'],
        },
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
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
      '@typescript-eslint/no-empty-interface': 'off',
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
      '@typescript-eslint/no-var-requires': 'off',

      'import/export': 2,
      'import/named': 'warn',
      'import/no-duplicates': 2,
      'import/no-unresolved': 2,

      'promise/catch-or-return': 1,
      /**
       * Allow native `Promise`s.
       * @remarks Originally, this was so that we could use [bluebird](https://npm.im/bluebird)
       * everywhere, but this is not strictly necessary.
       */
      'promise/no-native': 'off',
      'promise/no-return-wrap': 1,
      'promise/prefer-await-to-callbacks': 1,
      'promise/prefer-await-to-then': 1,
      'promise/param-names': 1,

      'array-bracket-spacing': 2,
      'arrow-body-style': [1, 'as-needed'],
      'arrow-parens': [1, 'always'],
      'arrow-spacing': 2,
      /**
       * Disables the `brace-style` rule.
       * @remarks Due to the way `prettier` sometimes formats extremely verbose types, sometimes it is necessary
       * to indent in a way that is not allowed by the default `brace-style` rule.
       */
      'brace-style': 'off',
      'comma-dangle': 0,
      'comma-spacing': [
        2,
        {
          before: false,
          after: true,
        },
      ],
      'curly': [2, 'all'],
      'dot-notation': 2,
      'eqeqeq': [2, 'smart'],
      'key-spacing': [
        2,
        {
          mode: 'strict',
          beforeColon: false,
          afterColon: true,
        },
      ],
      'keyword-spacing': 2,
      'no-buffer-constructor': 1,
      'no-console': 2,
      'no-dupe-class-members': 'off',
      'no-empty': 0,
      'no-multi-spaces': 2,
      'no-prototype-builtins': 1,
      'no-redeclare': 'off',
      'no-trailing-spaces': 2,
      'no-var': 2,
      'no-whitespace-before-property': 2,
      'object-shorthand': 2,
      'quotes': [
        2,
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: true,
        },
      ],
      'radix': [2, 'always'],
      'require-atomic-updates': 0,
      /**
       * Allow `async` functions without `await`.
       * @remarks Originally, this was to be more clear about the return value of a function, but with
       * the addition of types, this is no longer necessary. Further, both `return somePromise` and
       * `return await somePromise` have their own use-cases.
       */
      'require-await': 'off',
      'semi': [2, 'always'],
      'space-before-blocks': [2, 'always'],
      'space-in-parens': [2, 'never'],
      'space-infix-ops': 2,
      'space-unary-ops': [
        2,
        {
          words: true,
          nonwords: false,
        },
      ],
    }
  },

  {
    ...mochaPlugin.configs.flat.recommended,
    name: 'Test Files',
    files: ['**/test/**', '*.spec.*js', '-specs.*js', '*.spec.ts'],
    rules: {
      ...mochaPlugin.configs.flat.recommended.rules,
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
      'import/no-named-as-default-member': 'off',
      'mocha/consistent-spacing-between-blocks': 'off',
      'mocha/max-top-level-suites': 'off',
      'mocha/no-exclusive-tests': 2,
      'mocha/no-exports': 'off',
      'mocha/no-mocha-arrows': 2,
      'mocha/no-setup-in-describe': 'off',
      'mocha/no-skipped-tests': 'off',
    },
  },

  {
    name: 'Ignores',
    ignores: [
      ...(fs.existsSync(gitignorePath) ? includeIgnoreFile(gitignorePath).ignores : []),
      '**/.*',
      '**/*-d.ts',
      '**/*.min.js',
      '**/build/**',
      '**/coverage/**',
    ],
  }

];
