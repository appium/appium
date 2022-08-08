# @appium/eslint-config-appium

> Provides a reusable [ESLint](http://eslint.org/) [shared configuration](http://eslint.org/docs/developer-guide/shareable-configs) for [Appium](https://github.com/appium/appium) and Appium-adjacent projects.

## Usage

Install the package with **`npm` v7 or newer** (for automatic installation of peer dependencies):

```bash
npm install @appium/eslint-config-appium --save-dev
```

And then, in your `.eslintrc` file, extend the configuration:

```json
{
  "extends": "@appium/eslint-config-appium"
}
```

## Peer Dependencies

This config requires the following packages be installed (as dev dependencies) in your project.  See the `package.json` for the required versions.

- [eslint](https://www.npmjs.com/package/eslint)
- [eslint-config-prettier](https://www.npmjs.com/package/eslint-config-prettier)
- [eslint-plugin-import](https://www.npmjs.com/package/eslint-plugin-import)
- [eslint-plugin-mocha](https://www.npmjs.com/package/eslint-plugin-mocha)
- [eslint-plugin-promise](https://www.npmjs.com/package/eslint-plugin-promise)

## Notes

- This configuration is intended to be used alongside [Prettier](https://www.npmjs.com/package/prettier).
- This package was previously published as `eslint-config-appium`.

## License

Copyright © 2016 OpenJS Foundation. Licensed Apache-2.0
