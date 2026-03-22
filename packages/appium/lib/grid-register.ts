import axios from 'axios';
import {fs} from '@appium/support';
import type {StringRecord} from '@appium/types';
import _ from 'lodash';
import logger from './logger';

/**
 * Selenium **Grid 3** (legacy hub) node integration.
 *
 * Registers this Appium process as a node with a Selenium Grid 3 hub using the classic
 * `/grid/register` endpoint and `/grid/api/proxy` for re-registration checks.
 * This does **not** apply to Selenium Grid 4 (which uses a different topology and APIs).
 *
 * @see https://www.selenium.dev/documentation/legacy/grid_3/
 */

/** REST paths exposed by a Selenium Grid 3 hub. */
const GRID_V3_REGISTER_PATH = '/grid/register';
const GRID_V3_PROXY_API_PATH = '/grid/api/proxy';

/**
 * Registers this server as a node with a **Selenium Grid 3** hub.
 *
 * @param data - Path or object representing the Selenium Grid 3 node configuration file. If a `string`,
 * all subsequent arguments are required!
 * @param addr - Bind to this address
 * @param port - Bind to this port
 * @param basePath - Base path for the Appium server (used in the node URL sent to the hub)
 */
export default async function registerNode(
  data: string | Grid3NodeConfig,
  addr?: string,
  port?: number,
  basePath?: string
): Promise<void> {
  let configHolder: Grid3NodeConfig;
  if (_.isString(data)) {
    const configFilePath = data;
    let fileContent: string;
    try {
      fileContent = await fs.readFile(data, 'utf-8');
    } catch (err) {
      logger.error(
        `Unable to load Selenium Grid 3 node configuration file ${configFilePath} to ` +
        `register with the hub: ${(err as Error).message}`
      );
      return;
    }
    try {
      configHolder = JSON.parse(fileContent) as Grid3NodeConfig;
    } catch (err) {
      throw logger.errorWithException(
        `Syntax error in Selenium Grid 3 node configuration file ${configFilePath}: ` +
        (err as Error).message
      );
    }
  } else {
    configHolder = data;
  }

  postRequest(configHolder, addr, port, basePath);
}

/** Base URL for the Selenium Grid 3 hub (protocol + host + port). */
function hubUri(config: Grid3HubConfiguration): string {
  const protocol = config.hubProtocol || 'http';
  return `${protocol}://${config.hubHost}:${config.hubPort}`;
}

/** POST registration payload to the Selenium Grid 3 hub. */
async function registerToGrid(
  postOptions: {url: string; method: string; data: Grid3NodeConfig},
  configHolder: Grid3NodeConfig
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
      `Appium successfully registered with the Selenium Grid 3 hub at ` + hubUri(hubCfg)
    );
  } catch (err) {
    logger.error(
      `An attempt to register with the Selenium Grid 3 hub was unsuccessful: ` +
      (err as Error).message
    );
  }
}

function postRequest(
  configHolder: Grid3NodeConfig,
  addr?: string,
  port?: number,
  basePath?: string
): void {
  // Move Selenium Grid 3 (flat) configuration properties into `configuration`
  if (!_.has(configHolder, 'configuration')) {
    const configuration: StringRecord = {};
    const holder = configHolder as StringRecord;
    for (const property in holder) {
      if (_.has(holder, property) && property !== 'capabilities') {
        configuration[property] = holder[property];
        delete holder[property];
      }
    }
    holder.configuration = configuration as Grid3HubConfiguration;
  }

  const cfg = configHolder.configuration;
  if (!cfg) {
    return;
  }

  // if the node config does not have the appium/webdriver url, host, and port,
  // automatically add it based on how appium was initialized
  // otherwise, we will take whatever the user setup
  // because we will always set localhost/127.0.0.1. this won't work if your
  // node and hub aren't in the same place
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
    url: `${hubUri(cfg)}${GRID_V3_REGISTER_PATH}`,
    method: 'POST',
    data: configHolder,
  };

  if (cfg.register !== true) {
    logger.debug(`No Selenium Grid 3 hub registration sent (${cfg.register} = false)`);
    return;
  }

  const registerCycleInterval = cfg.registerCycle;
  if (registerCycleInterval === undefined || isNaN(registerCycleInterval) || registerCycleInterval <= 0) {
    logger.warn(
      `'registerCycle' is not a valid positive number. ` +
        `No registration request will be sent to the Selenium Grid 3 hub.`
    );
    return;
  }
  // initiate a new Thread
  let first = true;
  logger.debug(
    `Starting auto-register thread for Selenium Grid 3. ` +
      `Will try to register every ${registerCycleInterval} ms.`
  );
  setInterval(async function registerRetry() {
    if (first) {
      first = false;
      await registerToGrid(regRequest, configHolder);
    } else if (!(await isAlreadyRegistered(configHolder))) {
      // make the http POST to the Selenium Grid 3 hub for registration
      await registerToGrid(regRequest, configHolder);
    }
  }, registerCycleInterval);
}

/** Query the Selenium Grid 3 hub to see if this node id is already registered. */
async function isAlreadyRegistered(configHolder: Grid3NodeConfig): Promise<boolean | undefined> {
  //check if node is already registered
  const hubCfg = configHolder.configuration;
  if (!hubCfg?.id) {
    return;
  }
  const id = hubCfg.id;
  try {
    const {data, status} = await axios<Grid3ProxyApiResponse>({
      url: `${hubUri(hubCfg)}${GRID_V3_PROXY_API_PATH}?id=${id}`,
      timeout: 10000,
    });
    if (status !== 200) {
      throw new Error(`Request failed with code ${status}`);
    }
    if (!data.success) {
      // if register fail, print the debug msg
      logger.debug(`Selenium Grid 3 hub registration check: ${data.msg}`);
    }
    return data.success;
  } catch (err) {
    logger.debug(`Selenium Grid 3 hub down or not responding: ${(err as Error).message}`);
  }
}

interface Grid3HubConfiguration {
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

interface Grid3NodeConfig extends StringRecord {
  configuration?: Grid3HubConfiguration;
  capabilities?: unknown;
}

interface Grid3ProxyApiResponse {
  success: boolean;
  msg?: string;
}
