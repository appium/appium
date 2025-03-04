# @appium/eslint-config-appium-ts

> Provides a reusable [ESLint](http://eslint.org/) [shared configuration](http://eslint.org/docs/developer-guide/shareable-configs) for [Appium](https://github.com/appium/appium) and Appium-adjacent projects.

[![NPM version](http://img.shields.io/npm/v/@appium/eslint-config-appium-ts.svg)](https://npmjs.org/package/@appium/eslint-config-appium-ts)
[![Downloads](http://img.shields.io/npm/dm/@appium/eslint-config-appium-ts.svg)](https://npmjs.org/package/@appium/eslint-config-appium-ts)

## Usage

Install the package with **`npm` v8 or newer**:

```bash
npm install @appium/eslint-config-appium-ts --save-dev
```

And then, in your `eslint.config.mjs` file, extend the configuration:

```js
import appiumConfig from '@appium/eslint-config-appium-ts';

export default [
  ...appiumConfig,
  // add any other config changes 
];
```

## Peer Dependencies

This config requires the following packages be installed (as peer dependencies) in your project.  See the `package.json` for the required versions.

- [eslint](https://www.npmjs.com/package/eslint)
- [eslint-config-prettier](https://www.npmjs.com/package/eslint-config-prettier)
- [eslint-plugin-import](https://www.npmjs.com/package/eslint-plugin-import)
- [eslint-plugin-mocha](https://www.npmjs.com/package/eslint-plugin-mocha)
- [eslint-plugin-promise](https://www.npmjs.com/package/eslint-plugin-promise)
- [@typescript-eslint/eslint-plugin](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin)
- [@typescript-eslint/parser](https://www.npmjs.com/package/@typescript-eslint/parser)

## Notes

- This configuration is intended to be used alongside [Prettier](https://www.npmjs.com/package/prettier).

## License

Copyright © 2023 OpenJS Foundation. Licensed Apache-2.0
