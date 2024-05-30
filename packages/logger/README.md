# Appium Logger

The logger util that Appium uses.

# Installation

```console
npm install @appium/logger --save
```

# Basic Usage

```js
import log from '@appium/logger';

// additional stuff ---------------------------+
// message ----------+                         |
// prefix ----+      |                         |
// level -+   |      |                         |
//        v   v      v                         v
    log.info('fyi', 'I have a kitty cat: %j', myKittyCat);
```

# History

This module is forked from [npmlog](https://github.com/npm/npmlog) as [appium-logger](https://github.com/appium/appium-logger).
Then, we made various update as [the changelog](https://github.com/appium/appium-logger/blob/main/CHANGELOG.md).
