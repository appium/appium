---
hide:
  - toc

title: 屏蔽敏感日志数据
---

自 Appium server 2.18.0 版本起，已经具备了在日志中屏蔽敏感值的能力。 下面的教程将介绍如何在第三方扩展中使用这一功能。

## 为什么这很有用

将密码、令牌等敏感信息从服务器日志中隐藏起来是合理且必要的，这样即使日志落入错误的人手中，也不会意外泄露敏感数据。
Appium server 已经提供了一种通过 [过滤](../guides/log-filters.md) 来处理日志记录的方式，不过它本身存在一些限制。
当前这种方法则更为先进，但需要驱动/插件侧进行一些细调。

## 使用方法

假设你的扩展使用的是标准内置的 [@appium/logger](https://www.npmjs.com/package/@appium/logger)。
要让日志中的某个值被替换成通用的掩码，需要执行以下步骤：

- 将日志表达式改为包裹敏感值并进行格式化，例如：

    ```js
    this.log.info(`Value: ${value}`)；
    ```

  变为

    ```js
    import {logger} from '@appium/support';
    
    this.log.info('Value: %s', logger.markSensitive(value))；
    ```

  格式化过程会通过标准的 Node.js [util.format](https://nodejs.org/api/util.html#utilformatformat-args) API 完成。

- 在发送相应的服务器请求时，如果这个日志行被使用并且应该被掩码处理，请额外添加自定义请求头 `X-Appium-Is-Sensitive`，其值为 `1` 或 `true`（大小写不敏感）。
  如果没有这个请求头，上述日志值将不会被掩码处理。
  这样就可以根据扩展处理的具体请求来有条件地屏蔽日志记录；如果日志表达式位于公共部分，就可以在这里统一控制。
