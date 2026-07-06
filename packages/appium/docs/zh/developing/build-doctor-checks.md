---
title: 构建 Doctor Checks
---

Appium Doctor 的目标，是帮助用户完成驱动或插件的前置条件配置。 有时这些前置条件可能相当复杂，需要一定的技术知识。 Doctor checks是由扩展作者编写的普通 Node.js 类实例，它可以自动完成诊断并尝试修复发现的问题。 为了提供更好的使用体验，这些检查项有时也会是交互式的。

本教程适用于希望帮助用户处理复杂配置或设置步骤的插件或驱动作者。

## 添加 Doctor Checks

### 类型要求

术语 `Doctor Check` 的字面含义，是指一个实现了 [IDoctorCheck 接口](https://github.com/appium/appium/blob/master/packages/types/lib/doctor.ts) 的 JavaScript 类实例。
这个接口定义了以下方法和属性：

- `diagnose(): Promise<DoctorCheckResult>`：包含诊断某个问题的代码
- `fix(): Promise<string|null>`：如果 `hasAutofix()` 返回 true，则修复实际问题；否则返回一段手动修复的说明。 如果此方法抛出名为 `FixSkippedError` 的异常，并且 `hasAutofix()` 返回 true，那么该调用结果将被忽略。
- `hasAutofix(): boolean`：表示调用 `fix()` 是否能解决发现的问题
- `isOptional(): boolean`：表示发现的问题是否可以被忽略且不是阻塞性问题
- `log: AppiumLogger`：可用于日志输出。 这个属性可以由实例自行赋值，也可以由 Appium 服务在未赋值时自动提供。

`diagnose()` 方法返回的 `DoctorCheckResult` 对象必须包含以下属性：

- `ok: boolean`：诊断是否未发现任何问题。
- `optional: boolean`：诊断出的问题是否可以安全忽略。
- `message: string`：描述诊断结果的文本信息。

### 清单要求

一个扩展可以向 Appium 导出多个 Doctor checks。 为了让这些检查项在对应扩展安装后能够被服务端 CLI 正确识别，它们需要在package .json 清单文件中列在 `appium.doctor.checks` 部分，格式类似下面这样：

```json
  // ...
  "appium": {
    "driverName": "fake",
    "automationName": "Fake",
    "platformNames": [
      "Fake"
    ],
    "mainClass": "FakeDriver",
    "schema": "./build/lib/fake-driver-schema.js",
    "scripts": {
      "fake-error": "./build/lib/scripts/fake-error.js",
      "fake-success": "./build/lib/scripts/fake-success.js",
      "fake-stdin": "./build/lib/scripts/fake-stdin.js"
    },
    "doctor": {
      "checks": [
        "./doctor/fake1.js",
        "./doctor/fake2.js"
        // ...
      ]
    }
  },
  // ...
```

此外，建议将 [@appium/types](https://www.npmjs.com/package/@appium/types) 加入包的开发依赖中。

### 实现示例

下面是一个“原生”的 Node.js 实现示例，没有使用任何转译工具：

```js
const {fs, doctor} = require('@appium/support');

/** @satisfies {import('@appium/types').IDoctorCheck} */
class EnvVarAndPathCheck {
  /**
   * @param {string} varName
   */
  constructor(varName) {
    this.varName = varName;
  }

  async diagnose() {
    const varValue = process.env[this.varName];
    if (typeof varValue === 'undefined') {
      return doctor.nok(`${this.varName} environment variable is NOT set!`);
    }

    if (await fs.exists(varValue)) {
      return doctor.ok(`${this.varName} is set to: ${varValue}`);
    }

    return doctor.nok(`${this.varName} is set to '${varValue}' but this is NOT a valid path!`);
  }

  async fix() {
    return (
      `Make sure the environment variable ${this.varName} is properly configured for the Appium server process`
    );
  }

  hasAutofix() {
    return false;
  }

  isOptional() {
    return false;
  }
}

const androidHomeCheck = new EnvVarAndPathCheck('ANDROID_HOME');

module.exports = {androidHomeCheck};

/**
 * @typedef {import('@appium/types').DoctorCheckResult} CheckResult
 */
```

这个文件可以保存为 `doctor/android-home-check.js`，然后再将其加入到 package.json 清单中，例如：

```json
  // ...
  "appium": {
    // ...
    "doctor": {
      "checks": [
        "./doctor/android-home-check.js",
      ]
    }
    // ...
  },
  // ...
```
