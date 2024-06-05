# @appium/logger

> Appium's logging functionality

## Installation

```console
npm install @appium/logger --save
```

## Basic Usage

```js
import log from '@appium/logger';

// additional stuff ---------------------------+
// message ----------+                         |
// prefix ----+      |                         |
// level -+   |      |                         |
//        v   v      v                         v
    log.info('fyi', 'I have a kitty cat: %j', myKittyCat);
```

## History

This module is forked from [npmlog](https://github.com/npm/npmlog) under ISC License because the original project has been archived.
Please check [the npmlog changelog](https://github.com/npm/npmlog/blob/main/CHANGELOG.md) to see the list of former module updates before it was forked.

## License

ISC License
