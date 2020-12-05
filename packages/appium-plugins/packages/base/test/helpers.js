/* eslint-disable no-console */
import { exec } from 'teen_process';
import { main as appiumServer } from 'appium';

function e2eSetup (opts = {}) {
  let {
    before,
    after,
    server,
    appiumHome,
    driverSource,
    driverPackage,
    driverName,
    driverSpec,
    pluginSource,
    pluginPackage,
    pluginSpec,
    pluginName,
    port,
    host,
  } = opts;

  before(async function () {
    console.log('Checking whether driver dep is installed');
    let listArgs = ['appium', 'driver', 'list', '--home', appiumHome, '--json'];
    let {stdout} = await exec('npx', listArgs);
    let installed = JSON.parse(stdout);

    if (!installed[driverName]) {
      console.log('Not installed, installing...');
      const driverArgs = ['appium', 'driver', 'install', '--home', appiumHome, '--source', driverSource, driverSpec];
      if (driverPackage) {
        driverArgs.push('--package', driverPackage);
      }
      await exec('npx', driverArgs);
    }
    console.log('Driver dep is installed');

    console.log('Checking whether plugin is installed');
    listArgs = ['appium', 'plugin', 'list', '--home', appiumHome, '--json'];
    ({stdout} = await exec('npx', listArgs));
    installed = JSON.parse(stdout);

    if (!installed[pluginName]) {
      console.log('Installing the local version of this plugin');
      const pluginArgs = ['appium', 'plugin', 'install', '--home', appiumHome, '--source', pluginSource, pluginSpec];
      if (pluginPackage) {
        pluginArgs.push('--package', pluginPackage);
      }
      await exec('npx', pluginArgs);
    }
    console.log('This plugin is installed');

    const args = {port, host, appiumHome, plugins: [pluginName]};
    server = await appiumServer(args);
  });

  after(function () {
    if (server) {
      server.close();
    }
  });
}

export { e2eSetup };
