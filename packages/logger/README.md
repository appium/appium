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

This module is forked from [npmlog](https://github.com/npm/npmlog) under ISC License for Copyright npm, Inc since the project was archived. Please check [the npmlog changelo](https://github.com/npm/npmlog/blob/main/CHANGELOG.md) to see the list of former module updates befor it was forked.
