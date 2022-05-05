#!/usr/bin/env node
/* eslint-disable no-console, promise/prefer-await-to-then */

async function main() {
  const driverEnv = process.env.npm_config_drivers;
  const pluginEnv = process.env.npm_config_plugins;

  if (!driverEnv && !pluginEnv) {
    console.log('Not auto-installing any drivers or plugins');
    return;
  }

  let extension;
  try {
    extension = require('../build/lib/cli/extension');
  } catch (e) {
    throw new Error(
      `Could not load extension CLI file; has the project been transpiled? ` +
        `(${e.message})`
    );
  }

  const {
    DEFAULT_APPIUM_HOME,
    DRIVER_TYPE,
    PLUGIN_TYPE,
  } = require('./build/lib/extension-config');
  const {runExtensionCommand} = extension;
  const appiumHome = process.env.npm_config_appium_home || DEFAULT_APPIUM_HOME;
  const specs = [
    [DRIVER_TYPE, driverEnv],
    [PLUGIN_TYPE, pluginEnv],
  ];

  for (const [type, extEnv] of specs) {
    if (extEnv) {
      for (const ext of extEnv.split(',')) {
        try {
          await checkAndInstallExtension({
            runExtensionCommand,
            appiumHome,
            type,
            ext,
          });
        } catch (e) {
          console.log(
            `There was an error checking and installing ${type} ${ext}: ${e.message}`
          );
        }
      }
    }
  }
}

async function checkAndInstallExtension({
  runExtensionCommand,
  appiumHome,
  type,
  ext,
}) {
  const extList = await runExtensionCommand(
    {
      appiumHome,
      [`${type}Command`]: 'list',
      showInstalled: true,
      suppressOutput: true,
    },
    type
  );
  if (extList[ext]) {
    console.log(`The ${type} ${ext} was already installed, skipping...`);
    return;
  }
  console.log(`Installing the ${type} ${ext}...`);
  await runExtensionCommand(
    {
      appiumHome,
      [`${type}Command`]: 'install',
      [type]: ext,
      suppressOutput: true,
    },
    type
  );
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
