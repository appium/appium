import axios from 'axios';
import {fs} from '@appium/support';
import logger from './logger';
import _ from 'lodash';

const hubUri = (config) => {
  const protocol = config.hubProtocol || 'http';
  return `${protocol}://${config.hubHost}:${config.hubPort}`;
};

/**
 * Registers a new node with a selenium grid
 * @param {string|object} data - Path or object representing selenium grid node config file. If a `string`, all subsequent arguments are required!
 * @param {string} [addr] - Bind to this address
 * @param {number} [port] - Bind to this port
 * @param {string} [basePath] - Base path for the grid
 */
async function registerNode(data, addr, port, basePath) {
  let configFilePath;
  if (_.isString(data)) {
    configFilePath = data;
    try {
      data = await fs.readFile(data, 'utf-8');
    } catch (err) {
      logger.error(
        `Unable to load node configuration file ${configFilePath} to register with grid: ${err.message}`
      );
      return;
    }
    try {
      data = JSON.parse(data);
    } catch (err) {
      throw logger.errorWithException(
        `Syntax error in node configuration file ${configFilePath}: ${err.message}`
      );
    }
  }

  postRequest(data, addr, port, basePath);
}

async function registerToGrid(postOptions, configHolder) {
  try {
    const {status} = await axios(postOptions);
    if (status !== 200) {
      throw new Error(`Request failed with code ${status}`);
    }
    logger.debug(
      `Appium successfully registered with the the grid on ` + hubUri(configHolder.configuration)
    );
  } catch (err) {
    logger.error(`An attempt to register with the grid was unsuccessful: ${err.message}`);
  }
}

function postRequest(configHolder, addr, port, basePath) {
  // Move Selenium 3 configuration properties to configuration object
  if (!_.has(configHolder, 'configuration')) {
    let configuration = {};
    for (const property in configHolder) {
      if (_.has(configHolder, property) && property !== 'capabilities') {
        configuration[property] = configHolder[property];
        delete configHolder[property];
      }
    }
    configHolder.configuration = configuration;
  }

  // if the node config does not have the appium/webdriver url, host, and port,
  // automatically add it based on how appium was initialized
  // otherwise, we will take whatever the user setup
  // because we will always set localhost/127.0.0.1. this won't work if your
  // node and grid aren't in the same place
  if (
    !configHolder.configuration.url ||
    !configHolder.configuration.host ||
    !configHolder.configuration.port
  ) {
    configHolder.configuration.url = `http://${addr}:${port}${basePath}`;
    configHolder.configuration.host = addr;
    configHolder.configuration.port = port;
  }
  // if the node config does not have id automatically add it
  if (!configHolder.configuration.id) {
    configHolder.configuration.id = `http://${configHolder.configuration.host}:${configHolder.configuration.port}`;
  }

  // the post options
  const regRequest = {
    url: `${hubUri(configHolder.configuration)}/grid/register`,
    method: 'POST',
    data: configHolder,
  };

  if (configHolder.configuration.register !== true) {
    logger.debug(`No registration sent (${configHolder.configuration.register} = false)`);
    return;
  }

  const registerCycleInterval = configHolder.configuration.registerCycle;
  if (isNaN(registerCycleInterval) || registerCycleInterval <= 0) {
    logger.warn(
      `'registerCycle' is not a valid positive number. ` +
        `No registration request will be sent to the grid.`
    );
    return;
  }
  // initiate a new Thread
  let first = true;
  logger.debug(
    `Starting auto register thread for the grid. ` +
      `Will try to register every ${registerCycleInterval} ms.`
  );
  setInterval(async function registerRetry() {
    if (first) {
      first = false;
      await registerToGrid(regRequest, configHolder);
    } else if (!(await isAlreadyRegistered(configHolder))) {
      // make the http POST to the grid for registration
      await registerToGrid(regRequest, configHolder);
    }
  }, registerCycleInterval);
}

async function isAlreadyRegistered(configHolder) {
  //check if node is already registered
  const id = configHolder.configuration.id;
  try {
    const {data, status} = await axios({
      url: `${hubUri(configHolder.configuration)}/grid/api/proxy?id=${id}`,
      timeout: 10000,
    });
    if (status !== 200) {
      throw new Error(`Request failed with code ${status}`);
    }
    if (!data.success) {
      // if register fail, print the debug msg
      logger.debug(`Grid registration error: ${data.msg}`);
    }
    return data.success;
  } catch (err) {
    logger.debug(`Hub down or not responding: ${err.message}`);
  }
}

export default registerNode;
