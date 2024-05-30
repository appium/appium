# Appium Logger

The logger util that Appium uses.
Forked from [npmlog](https://github.com/npm/npmlog)

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
