# @appium/doctor

> Attempts to diagnose and fix common Appium configuration issues

[![NPM version](http://img.shields.io/npm/v/@appium/doctor.svg)](https://npmjs.org/package/@appium/doctor)
[![Downloads](http://img.shields.io/npm/dm/@appium/doctor.svg)](https://npmjs.org/package/@appium/doctor)

> [!WARNING]
> This package has been deprecated since the Appium server v 2.4.0 and will be removed in the future.
> Use doctor checks (if any exist) integrated into your installed driver or plugin by
> running `appium driver doctor <driver_name>` or `appium plugin doctor <plugin_name>`.

### Install

```
npm install @appium/doctor -g
```

### Usage

```
➜  appium-doctor -h

Usage: appium-doctor.js [options, defaults: --ios --android]

Options:
  --ios       Check iOS setup                             [boolean]
  --android   Check Android setup                         [boolean]
  --dev       Check dev setup                             [boolean]
  --debug     Show debug messages                         [boolean]
  --yes       Always respond yes                          [boolean]
  --no        Always respond no                           [boolean]
  --demo      Run appium-doctor demo (for dev).           [boolean]
  -h, --help  Show help                                   [boolean]
```

## License

Apache-2.0
