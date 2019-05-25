## --default-capabilities 标识

Appium 1.5 移除了大部分旧版本遗留的 CLI 标识；其余部分可转换成 JSON 并成为 `--default-capabilities` 标识的一部分。举个例子:

```
# 未处理的 JSON 作为一个参数
--default-capabilities '{"app": "myapp.app", "deviceName": "iPhone Simulator"}'
# 或一个 JSON 文件的名字
--default-capabilities /path/to/file.json
```

**Windows 用户**在命令行传递 JSON 时记得去掉引号：`--default-capabilities "{\"app\": \"myapp.app\"}"`


| Flag                      | JSON key                |
|---------------------------|-------------------------|
| --keep-artifacts          | keepArtifacts           |
| --platform-name           | platformName            |
| --platform-version        | platformVersion         |
| --automation-name         | automationName          |
| --device-name             | deviceName              |
| --browser-name            | browserName             |
| --app                     | app                     |
| --launch-timeout          | launchTimeout           |
| --language                | language                |
| --locale                  | locale                  |
| --udid                    | udid                    |
| --orientation             | orientation             |
| --no-reset                | noReset                 |
| --full-reset              | fullReset               |
| --app-pkg                 | appPackage              |
| --app-activity            | appActivity             |
| --app-wait-package        | appWaitPackage          |
| --app-wait-activity       | appWaitActivity         |
| --device-ready-timeout    | deviceReadyTimeout      |
| --android-coverage        | androidCoverage         |
| --avd                     | avd                     |
| --avd-args                | avdArgs                 |
| --use-keystore            | useKeystore             |
| --keystore-path           | keystorePath            |
| --keystore-password       | keystorePassword        |
| --key-alias               | keyAlias                |
| --key-password            | keyPassword             |
| --intent-action           | intentAction            |
| --intent-category         | intentCategory          |
| --intent-flags            | intentFlags             |
| --intent-args             | optionalIntentArguments |
| --dont-stop-app-on-reset  | dontStopAppOnReset      |
| --calendar-format         | calendarFormat          |
| --native-instruments-lib  | nativeInstrumentsLib    |
| --keep-keychains          | keepKeyChains           |
| --localizable-strings-dir | localizableStringsDir   |
| --show-ios-log            | showIOSLog              |
| --reboot                  | reboot                  |

---
EOF.

本文由 [thanksdanny](https://testerhome.com/thanksdanny) 翻译

Last english version: a4dd79b8144864cbc034eb97a8f0b5d744e3435c, Oct 24, 2017
