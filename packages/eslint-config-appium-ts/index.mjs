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
    name: 'JS/TS Files',
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
      'no-console': 2,
      semi: [2, 'always'],
      radix: [2, 'always'],
      'dot-notation': 2,
      eqeqeq: [2, 'smart'],
      'comma-dangle': 0,
      'no-empty': 0,
      'object-shorthand': 2,
      'arrow-parens': [1, 'always'],
      'arrow-body-style': [1, 'as-needed'],
      'import/export': 2,
      'import/no-unresolved': 2,
      'import/no-duplicates': 2,
      'promise/no-return-wrap': 1,
      'promise/param-names': 1,
      'promise/catch-or-return': 1,
      'promise/prefer-await-to-then': 1,
      'promise/prefer-await-to-callbacks': 1,
      'no-var': 2,
      curly: [2, 'all'],

      // enforce spacing
      'arrow-spacing': 2,
      'keyword-spacing': 2,
      'comma-spacing': [
        2,
        {
          before: false,
          after: true,
        },
      ],
      'array-bracket-spacing': 2,
      'no-trailing-spaces': 2,
      'no-whitespace-before-property': 2,
      'space-in-parens': [2, 'never'],
      'space-before-blocks': [2, 'always'],
      'space-unary-ops': [
        2,
        {
          words: true,
          nonwords: false,
        },
      ],
      'space-infix-ops': 2,
      'key-spacing': [
        2,
        {
          mode: 'strict',
          beforeColon: false,
          afterColon: true,
        },
      ],
      'no-multi-spaces': 2,
      quotes: [
        2,
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: true,
        },
      ],
      'no-buffer-constructor': 1,
      'require-atomic-updates': 0,
      'no-prototype-builtins': 1,
      'no-redeclare': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-dupe-class-members': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'import/named': 'warn',

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
      /**
       * Sometimes we want unused variables to be present in base class method declarations.
       */
      '@typescript-eslint/no-unused-vars': 'warn',
      /**
       * Allow native `Promise`s. **This overrides `@appium/eslint-config-appium`.**
       * @remarks Originally, this was so that we could use [bluebird](https://npm.im/bluebird)
       * everywhere, but this is not strictly necessary.
       */
      'promise/no-native': 'off',
      /**
       * Allow `async` functions without `await`.  **This overrides `@appium/eslint-config-appium`.**
       * @remarks Originally, this was to be more clear about the return value of a function, but with
       * the addition of types, this is no longer necessary. Further, both `return somePromise` and
       * `return await somePromise` have their own use-cases.
       */
      'require-await': 'off',

      /**
       * Disables the `brace-style` rule.
       * @remarks Due to the way `prettier` sometimes formats extremely verbose types, sometimes it is necessary
       * to indent in a way that is not allowed by the default `brace-style` rule.
       */
      'brace-style': 'off',
    }
  },

  {
    ...mochaPlugin.configs.flat.recommended,
    name: 'Test Overrides',
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
      'mocha/no-exclusive-tests': 2,
      'mocha/no-mocha-arrows': 2,
      'mocha/max-top-level-suites': 'off',
      'mocha/consistent-spacing-between-blocks': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'mocha/no-setup-in-describe': 'off',
      'mocha/no-exports': 'off',
      'import/no-named-as-default-member': 'off',
      'mocha/no-skipped-tests': 'off',
    },
  },

  {
    name: 'Default Ignores',
    ignores: [
      ...(fs.existsSync(gitignorePath) ? includeIgnoreFile(gitignorePath).ignores : []),
      '**/*-d.ts',
      '**/build/**',
      '**/*.min.js',
      '**/coverage/**',
      '**/node_modules/**',
    ],
  }

];
