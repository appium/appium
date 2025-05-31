---
hide:
  - toc
title: Masking Sensitive Log Data
---

Since Appium server version 2.18.0 there is a possibility to mask sensitive
values in logs. The below tutorial explains how to use this feature in third-party
extensions.

## Why It Might Be Useful

It is the right call to hide sensitive information, like passwords, tokens, etc.
from server logs, so it does not accidentally leak if these logs end up in wrong hands.
Appium server already provides a way to manipulate logs records via
[filtering](../guides/log-filters.md), although it has its own limitations.
The current approach is more sophisticated though, and requires some fine-tuning
on the driver/plugin side.

## How To

The assumption is that your extension uses the standard built-in
[@appium/logger](https://www.npmjs.com/package/@appium/logger).
In order to get some value in logs replaced by a generic mask it is necessary:

- Change the logging expression to wrap sensitive values and format them, for example:

    ```js
    this.log.info(`Value: ${value}`);
    ```

  becomes

    ```js
    import {logger} from '@appium/support';
    
    this.log.info('Value: %s', logger.markSensitive(value));
    ```

  The formatting happens via the standard Node.js's
  [util.format](https://nodejs.org/api/util.html#utilformatformat-args) API.

- While sending the appropriate server request, where this log line is used and should be masked,
  add the custom header `X-Appium-Is-Sensitive` with its value set to `1` or `true` (case-insensitive).
  Without such header the above log value is not going to be masked.
  This way it is possible to conditionally mask log records depending on which
  request is being handled by the extension if the log expression is used in the
  common section.
