import _ from 'lodash';
import { KNOWN_DRIVERS, validateDriversJson, writeInstalledDriver,
         INSTALL_TYPE_LOCAL, INSTALL_TYPE_NPM, INSTALL_TYPE_GIT,
         INSTALL_TYPE_GITHUB } from './drivers';
import { getLatestVersion, installPackage, linkPackage } from './npm';
import { errAndQuit, log, spinWith } from './cli-utils';
import { util } from 'appium-support';

let INSTALLED_DRIVERS;

async function runDriverCommand (args) {
  // TODO driver.json file should be locked while any of these commands are
  // running to prevent weird situations
  let jsonResult = null;
  const logFn = (msg) => log(args.json, msg);
  try {
    INSTALLED_DRIVERS = validateDriversJson(logFn);
    switch (args.driverCommand) {
      case 'list':
        jsonResult = await list(args);
        break;
      case 'install':
        jsonResult = await install(args);
        break;
      case 'uninstall':
        jsonResult = await uninstall(args);
        break;
      case 'update':
        jsonResult = await update(args);
        break;
      default:
        throw new Error(`Cannot handle driver command ${args.driverCommand}`);
    }
  } catch (err) {
    errAndQuit(args.json, err.message);
  }

  if (args.json) {
    console.log(JSON.stringify(jsonResult)); // eslint-disable-line no-console
  }
}

async function list ({json, showInstalled, showUpdates}) {
  const lsMsg = `Listing ${showInstalled ? 'installed' : 'available'} drivers`;
  const drivers = {};

  for (const name of Object.keys(INSTALLED_DRIVERS)) {
    drivers[name] = INSTALLED_DRIVERS[name];
    drivers[name].installed = true;
  }

  if (!showInstalled) {
    for (const name of Object.keys(KNOWN_DRIVERS)) {
      if (!drivers[name]) {
        drivers[name] = {
          pkgName: KNOWN_DRIVERS[name],
          installed: false,
        };
      }
    }
  }

  await spinWith(json, lsMsg, async () => {
    if (showUpdates) {
      for (const name of Object.keys(drivers)) {
        const {version, pkgName, installType} = drivers[name];
        drivers[name].updateVersion = null;
        if (installType === INSTALL_TYPE_NPM) {
          const latestVersion = await getLatestVersion(pkgName);
          if (!version || util.compareVersions(latestVersion, '>', version)) {
            drivers[name].updateVersion = latestVersion;
          }
        }
      }
    }
  });

  if (!json) {
    for (const name of Object.keys(drivers)) {
      const {installType, installSpec, installed, updateVersion, version} = drivers[name];
      let typeTxt;
      switch (installType) {
        case INSTALL_TYPE_GIT:
        case INSTALL_TYPE_GITHUB:
          typeTxt = `(cloned from ${installSpec})`.yellow;
          break;
        case INSTALL_TYPE_LOCAL:
          typeTxt = `(linked from ${installSpec})`.magenta;
          break;
        default:
          typeTxt = '(NPM)';
      }
      const installTxt = installed ?
        `@${version.yellow} ${('[installed ' + typeTxt + ']').green}` :
        ' [not installed]'.grey;
      const updateTxt = showUpdates && updateVersion ?
        ` [${updateVersion} available]`.magenta :
        '';

      console.log(`- ${name.yellow}${installTxt}${updateTxt}`); // eslint-disable-line no-console
    }
  }
  return drivers;
}

async function install ({json, driver, local, npm, github, git}) {
  log(json, `Attempting to find and install driver '${driver}'`);

  let driverData, installType, installSpec = driver;

  if (local) {
    installType = INSTALL_TYPE_LOCAL;
    const msg = 'Linking driver from local path';
    const pkgJsonData = await spinWith(json, msg, async () => {
      return await linkPackage(installSpec);
    });
    driverData = getDriverFields(pkgJsonData);
  } else if (github) {
    installType = INSTALL_TYPE_GITHUB;
    if (installSpec.split('/').length !== 2) {
      throw new Error(`Github driver spec ${installSpec} appeared to be invalid; ` +
                      'it should be of the form <org>/<repo>');
    }
    driverData = await installViaNpm(json, installSpec);
  } else if (git) {
    installType = INSTALL_TYPE_GIT;
    driverData = await installViaNpm(json, installSpec);
  } else {
    installType = INSTALL_TYPE_NPM;

    // drivers installed via npm can include versions or tags after the '@'
    // sign, so check for that
    const [name, pkgVer] = installSpec.split('@');
    let pkgName;

    if (npm) {
      // if we're installing a named package from npm, we don't need to check
      // against the appium driver list; just use the installSpec as is
      pkgName = name;
    } else {
      // if we're installing a named appium driver (like 'xcuitest') we need to
      // dereference the actual npm package ('appiupm-xcuitest-driver'), so
      // check it exists and get the correct package
      const knownNames = Object.keys(KNOWN_DRIVERS);
      if (!_.includes(knownNames, name)) {
        const msg = `Could not resolve driver; are you sure it's in the list ` +
                    `of supported drivers? ${JSON.stringify(knownNames)}`;
        throw new Error(msg);
      }
      pkgName = KNOWN_DRIVERS[name];
    }

    driverData = await installViaNpm(json, driver, pkgName, pkgVer);
  }

  if (!driverData.driverName || !driverData.version || !driverData.automationName ||
      !driverData.platformNames || !driverData.mainClass) {
    throw new Error(`Installed driver did not expose correct fields for ` +
                    `compability with Appium.`);
  }

  const {driverName} = driverData;
  delete driverData.driverName;

  if (_.includes(Object.keys(INSTALLED_DRIVERS), driverName)) {
    throw new Error(`A driver named '${driverName}' is already installed. ` +
                    `Did you mean to update? 'appium driver update'. See ` +
                    `installed drivers with 'appium driver list --installed'.`);
  }

  driverData.installType = installType;
  driverData.installSpec = installSpec;
  await writeInstalledDriver(driverName, driverData);

  // refresh the installed driver manifest
  INSTALLED_DRIVERS = validateDriversJson((msg) => log(json, msg));

  // log info for the user
  log(json, `Driver ${driverName}@${driverData.version} successfully installed`.green);
  log(json, `- automationName: ${driverData.automationName.green}`);
  log(json, `- platformNames: ${JSON.stringify(driverData.platformNames).green}`);

  return INSTALLED_DRIVERS;
}

async function installViaNpm (json, driver, pkgName, pkgVer) {
  if (!pkgName) {
    pkgName = driver;
  }
  const npmSpec = `${pkgName}${pkgVer ? '@' + pkgVer : ''}`;
  const specMsg = npmSpec === driver ? '' : ` using NPM install spec '${npmSpec}'`;
  const msg = `Installing '${driver}'${specMsg}`;
  try {
    const pkgJsonData = await spinWith(json, msg, async () => {
      return await installPackage(pkgName, pkgVer);
    });
    return getDriverFields(pkgJsonData);
  } catch (err) {
    throw new Error(`Encountered an error when installing package: ${err.message}`);
  }
}

function getDriverFields (pkgJsonData) {
  const {appium, name, version} = pkgJsonData;
  const {driverName, automationName, platformNames, mainClass} = appium;
  return {version, pkgName: name, driverName, automationName, platformNames, mainClass};
}

function uninstall (/*{json, driver}*/) {
  // TODO implementation
  return {};
}

function update (/*{json, driver}*/) {
  // TODO implementation
  return {};
}

export {
  runDriverCommand
};
