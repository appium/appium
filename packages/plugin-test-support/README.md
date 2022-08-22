# @appium/pluginb-test-support

> Testing utilities for [Appium](https://appium.io) plugins

This package is for plugin authors to help test their plugins.

[Mocha](https://mochajs.org) is the supported test framework (but can theoretically be used with others).

## Usage

### For E2E Tests

The `pluginE2EHarness` method configures a server and driver for testing via "before all" and "after all"-style hooks.

This example uses [WebdriverIO](https://webdriver.io) to communicate with a test Appium server.

```js
import {pluginE2EHarness} from '@appium/plugin-test-support';
import {remote} from 'webdriverio';

describe('MyPlugin', function() {
  pluginE2EHarness({
    before: global.before, // from mocha
    after: global.after, // from mocha
    serverArgs: SOME_EXTRA_SERVER_ARGS,
    port: 31337,
    host: '127.0.0.1',
    appiumHome: process.env.APPIUM_HOME, // best practice: use a temp dir instead
    driverName: 'fake', // driver to test with
    driverSource: 'local', // use "local" unless you want appium to install from npm every time
    driverSpec: FAKE_DRIVER_DIR, // path to local driver working copy or installation
    pluginName: 'MyPlugin', // your plugin 
    pluginSource: 'local', // use "local" for this
    pluginSpec: THIS_PLUGIN_DIR, // dir of this plugin's `package.json`
  });

  it('should use my plugin', async function() {
    // at this point, the Appium server will be running with the plugin/driver combination of your
    // choosing

    // port/host should match what you provided to `pluginE2EHarness`
    const browser = await remote({port: 31337, hostname: '127.0.0.1'});
  })
});
```

## License

Apache-2.0
