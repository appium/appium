import axios from 'axios';
import {fs} from '@appium/support';
import type {StringRecord} from '@appium/types';
import _ from 'lodash';
import logger from './logger';

interface GridHubConfiguration {
  hubProtocol?: string;
  hubHost?: string;
  hubPort?: number;
  url?: string;
  host?: string;
  port?: number;
  id?: string;
  register?: boolean;
  registerCycle?: number;
}

interface GridNodeConfig extends StringRecord {
  configuration?: GridHubConfiguration;
  capabilities?: unknown;
}

interface GridProxyApiResponse {
  success: boolean;
  msg?: string;
}

/**
 * Registers a new node with a selenium grid
 * @param data - Path or object representing selenium grid node config file. If a `string`, all subsequent arguments are required!
 * @param addr - Bind to this address
 * @param port - Bind to this port
 * @param basePath - Base path for the grid
 */
export default async function registerNode(
  data: string | GridNodeConfig,
  addr?: string,
  port?: number,
  basePath?: string
): Promise<void> {
  let configHolder: GridNodeConfig;
  if (_.isString(data)) {
    const configFilePath = data;
    let fileContent: string;
    try {
      fileContent = await fs.readFile(data, 'utf-8');
    } catch (err) {
      logger.error(
        `Unable to load node configuration file ${configFilePath} to register with grid: ${(err as Error).message}`
      );
      return;
    }
    try {
      configHolder = JSON.parse(fileContent) as GridNodeConfig;
    } catch (err) {
      throw logger.errorWithException(
        `Syntax error in node configuration file ${configFilePath}: ${(err as Error).message}`
      );
    }
  } else {
    configHolder = data;
  }

  postRequest(configHolder, addr, port, basePath);
}

function hubUri(config: GridHubConfiguration): string {
  const protocol = config.hubProtocol || 'http';
  return `${protocol}://${config.hubHost}:${config.hubPort}`;
}

async function registerToGrid(
  postOptions: {url: string; method: string; data: GridNodeConfig},
  configHolder: GridNodeConfig
): Promise<void> {
  const hubCfg = configHolder.configuration;
  if (!hubCfg) {
    return;
  }
  try {
    const {status} = await axios(postOptions);
    if (status !== 200) {
      throw new Error(`Request failed with code ${status}`);
    }
    logger.debug(
      `Appium successfully registered with the the grid on ` + hubUri(hubCfg)
    );
  } catch (err) {
    logger.error(`An attempt to register with the grid was unsuccessful: ${(err as Error).message}`);
  }
}

function postRequest(
  configHolder: GridNodeConfig,
  addr?: string,
  port?: number,
  basePath?: string
): void {
  // Move Selenium 3 configuration properties to configuration object
  if (!_.has(configHolder, 'configuration')) {
    const configuration: StringRecord = {};
    const holder = configHolder as StringRecord;
    for (const property in holder) {
      if (_.has(holder, property) && property !== 'capabilities') {
        configuration[property] = holder[property];
        delete holder[property];
      }
    }
    holder.configuration = configuration as GridHubConfiguration;
  }

  const cfg = configHolder.configuration;
  if (!cfg) {
    return;
  }

  // if the node config does not have the appium/webdriver url, host, and port,
  // automatically add it based on how appium was initialized
  // otherwise, we will take whatever the user setup
  // because we will always set localhost/127.0.0.1. this won't work if your
  // node and grid aren't in the same place
  if (!cfg.url || !cfg.host || !cfg.port) {
    cfg.url = `http://${addr}:${port}${basePath}`;
    cfg.host = addr;
    cfg.port = port;
  }
  // if the node config does not have id automatically add it
  if (!cfg.id) {
    cfg.id = `http://${cfg.host}:${cfg.port}`;
  }

  // the post options
  const regRequest = {
    url: `${hubUri(cfg)}/grid/register`,
    method: 'POST',
    data: configHolder,
  };

  if (cfg.register !== true) {
    logger.debug(`No registration sent (${cfg.register} = false)`);
    return;
  }

  const registerCycleInterval = cfg.registerCycle;
  if (registerCycleInterval === undefined || isNaN(registerCycleInterval) || registerCycleInterval <= 0) {
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

async function isAlreadyRegistered(configHolder: GridNodeConfig): Promise<boolean | undefined> {
  //check if node is already registered
  const hubCfg = configHolder.configuration;
  if (!hubCfg?.id) {
    return;
  }
  const id = hubCfg.id;
  try {
    const {data, status} = await axios<GridProxyApiResponse>({
      url: `${hubUri(hubCfg)}/grid/api/proxy?id=${id}`,
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
    logger.debug(`Hub down or not responding: ${(err as Error).message}`);
  }
}
