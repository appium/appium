# @appium/plugin-test-support

> Testing utilities for [Appium](https://appium.io) plugins

This package is for plugin authors to help test their plugins.

## Usage

### For E2E Tests

The `pluginE2EHarness` method configures a server and driver for testing via setup/teardown callbacks.

This example uses [WebdriverIO](https://webdriver.io) to communicate with a test Appium server.

```ts
import {pluginE2EHarness} from '@appium/plugin-test-support';
import {remote} from 'webdriverio';

describe('MyPlugin', function() {
  let port: number;
  let hostname: string;

  const {setup, teardown} = pluginE2EHarness({
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

  before(async function () {
    const {server} = await setup();
    const address = server.address();
    port = address.port;
    hostname = address.address;
  });
  after(async function () {
    await teardown();
  });


  it('should use my plugin', async function() {
    // at this point, the Appium server will be running with the plugin/driver combination of your
    // choosing
    const browser = await remote({port, hostname});
  })
});
```

## License

Apache-2.0
