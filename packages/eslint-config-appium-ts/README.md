# @appium/eslint-config-appium-ts

> Provides a reusable [ESLint](http://eslint.org/) [shared configuration](http://eslint.org/docs/developer-guide/shareable-configs) for [Appium](https://github.com/appium/appium) and Appium-adjacent projects.

[![NPM version](http://img.shields.io/npm/v/@appium/eslint-config-appium-ts.svg)](https://npmjs.org/package/@appium/eslint-config-appium-ts)
[![Downloads](http://img.shields.io/npm/dm/@appium/eslint-config-appium-ts.svg)](https://npmjs.org/package/@appium/eslint-config-appium-ts)

## Usage

Install the package:

```bash
npm install @appium/eslint-config-appium-ts --save-dev
```

Then add it to your `eslint.config.mjs` file:

```js
import appiumConfig from '@appium/eslint-config-appium-ts';
import {defineConfig} from 'eslint/config';

export default defineConfig([
  {
    extends: [appiumConfig],
    // add any other config changes 
  },
]);
```

Or for ESLint `< 9.22.0`:

```js
import appiumConfig from '@appium/eslint-config-appium-ts';

export default [
  ...appiumConfig,
  // add any other config changes 
];
```

## Notes

- This configuration is intended to be used alongside [Prettier](https://www.npmjs.com/package/prettier).

## License

Copyright © 2023 OpenJS Foundation. Licensed Apache-2.0
