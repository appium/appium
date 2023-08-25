/**
 * `@appium/eslint-config-appium-ts` is a configuration for ESLint which extends
 * `@appium/eslint-config-appium` and adds TypeScript support.
 *
 * It is **not** a _replacement for_ `@appium/eslint-config-appium`.
 *
 * It can be used _without any `.ts` sources_, as long as a `tsconfig.json` exists in the project
 * root. In that case, it will run on `.js` files which are enabled for checking; this includes the
 * `checkJs` setting and any `// @ts-check` directive in source files.
 */

module.exports = {
  $schema: 'http://json.schemastore.org/eslintrc',
  parser: '@typescript-eslint/parser',
  extends: ['@appium/eslint-config-appium', 'plugin:@typescript-eslint/recommended'],
  rules: {
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
     * This disallows use of `require()`.
     * @remarks We _do_ use `require()` fairly often to load files on-the-fly; however, these may
     * want to be replaced with `import()` (I am not sure if there's a rule about that?).  **If this check fails**, disable the rule for the particular line.
     */
    '@typescript-eslint/no-var-requires': 'error',
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
  },
  /**
   * This stuff enables `eslint-plugin-import` to resolve TS modules.
   */
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        project: ['tsconfig.json', './packages/*/tsconfig.json'],
      },
    },
  },
  overrides: [
    /**
     * Overrides for tests.
     */
    {
      files: ['**/test/**', '*.spec.js', '-specs.js', '*.spec.ts'],
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
      },
    },
  ],
};
