import { KNOWN_DRIVERS, validateDriversJson } from './drivers';
import { logger } from 'appium-support';
const log = logger.getLogger('Driver CLI');

let INSTALLED_DRIVERS;

async function runDriverCommand (args) {
  let jsonResult = null;
  try {
    INSTALLED_DRIVERS = validateDriversJson();
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
    if (args.json) {
      jsonResult = {error: err.message};
      console.log(JSON.stringify(jsonResult));
    } else {
      log.error(err.message);
    }
    process.exit(1);
  }

  if (args.json) {
    console.log(JSON.stringify(jsonResult));
  }
}

function list ({json, installed, showUpdates}) {
  console.log(`Listing ${installed ? 'installed' : 'available'} drivers`);
  const drivers = {};

  for (const name of Object.keys({...INSTALLED_DRIVERS})) {
    drivers[name] = INSTALLED_DRIVERS[name];
    drivers[name].installed = true;
  }

  if (!installed) {
    for (const name of Object.keys(KNOWN_DRIVERS)) {
      if (!drivers[name]) {
        drivers[name] = {
          pkg: KNOWN_DRIVERS[name],
          installed: false,
        };
      }
    }
  }

  if (showUpdates) {
    // TODO
  }
  if (!json) {
    for (const name of Object.keys(drivers)) {
      const installTxt = drivers[name].installed ?
        `@${drivers[name].version} [installed]` :
        ' [not installed]';

      console.log(`- ${name}${installTxt}`);
    }
  }
  return drivers;
}

async function install ({json, driver, npm, github, git}) {
  // TODO implementation
  return {};
}

async function uninstall ({json, driver}) {
  // TODO implementation
  return {};
}

async function update ({json, driver}) {
  // TODO implementation
  return {};
}

export {
  runDriverCommand
};
