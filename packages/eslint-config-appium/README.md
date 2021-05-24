## Appium ESLint Shared Configuation

This package works to provide [eslint](http://eslint.org/) [shared configuration](http://eslint.org/docs/developer-guide/shareable-configs) to replace the need for a local `.eslintrc` file.

It uses [babel-eslint](https://github.com/babel/babel-eslint) as a parser.

### Usage

Install the package

```bash
npm install @appium/eslint-config-appium eslint-plugin-import eslint-plugin-mocha eslint-plugin-promise -D
```

And then, in your `.eslintrc` file extend the configuration

```json
{
  "extends": "@appium/eslint-config-appium"
}
```

If you are using [@appium/gulp-plugins](https://www.npmjs.com/package/@appium/gulp-plugins) you can then run

```bash
gulp eslint
```

### Peer Dependencies

This config requires the following packages be installed (as dev dependencies) in your project:

* [babel-eslint](https://www.npmjs.com/package/babel-eslint)
* [eslint](https://www.npmjs.com/package/eslint)
* [eslint-plugin-import](https://www.npmjs.com/package/eslint-plugin-import)
* [eslint-plugin-mocha](https://www.npmjs.com/package/eslint-plugin-mocha)
* [eslint-plugin-promise](https://www.npmjs.com/package/eslint-plugin-promise)
