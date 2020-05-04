import axios from 'axios';
import { fs } from 'appium-support';
import logger from './logger';
import _ from 'lodash';


const hubUri = (config) => {
  const protocol = config.hubProtocol || 'http';
  return `${protocol}://${config.hubHost}:${config.hubPort}`;
};

async function registerNode (configFile, addr, port) {
  let data;
  try {
    data = await fs.readFile(configFile, 'utf-8');
  } catch (err) {
    logger.error(`Unable to load node configuration file to register with grid: ${err.message}`);
    return;
  }

  // Check presence of data before posting  it to the selenium grid
  if (!data) {
    logger.error('No data found in the node configuration file to send to the grid');
    return;
  }
  postRequest(data, addr, port);
}

async function registerToGrid (postOptions, configObj) {
  try {
    const {status} = await axios(postOptions);
    if (status !== 200) {
      throw new Error(`Request failed with code ${status}`);
    }
    let logMessage = `Appium successfully registered with the grid on ${hubUri(configObj.configuration)}`;
    logger.debug(logMessage);
  } catch (err) {
    logger.error(`Request to register with grid was unsuccessful: ${err.message}`);
  }
}

function postRequest (data, addr, port) {
  // parse json to get hub host and port
  let jsonObject;
  try {
    jsonObject = JSON.parse(data);
  } catch (err) {
    logger.errorAndThrow(`Syntax error in node configuration file: ${err.message}`);
  }

  // Move Selenium 3 configuration properties to configuration object
  if (!_.has(jsonObject, 'configuration')) {
    let configuration = {};
    for (const property in jsonObject) {
      if (_.has(jsonObject, property) && property !== 'capabilities') {
        configuration[property] = jsonObject[property];
        delete jsonObject[property];
      }
    }
    jsonObject.configuration = configuration;
  }

  // if the node config does not have the appium/webdriver url, host, and port,
  // automatically add it based on how appium was initialized
  // otherwise, we will take whatever the user setup
  // because we will always set localhost/127.0.0.1. this won't work if your
  // node and grid aren't in the same place
  if (!jsonObject.configuration.url || !jsonObject.configuration.host || !jsonObject.configuration.port) {
    jsonObject.configuration.url = `http://${addr}:${port}/wd/hub`;
    jsonObject.configuration.host = addr;
    jsonObject.configuration.port = port;
  }
  // if the node config does not have id automatically add it
  if (!jsonObject.configuration.id) {
    jsonObject.configuration.id = `http://${jsonObject.configuration.host}:${jsonObject.configuration.port}`;
  }

  // the post options
  const post_options = {
    url: `${hubUri(jsonObject.configuration)}/grid/register`,
    method: 'POST',
    data: jsonObject,
  };

  if (jsonObject.configuration.register !== true) {
    logger.debug(`No registration sent (${jsonObject.configuration.register} = false)`);
    return;
  }

  let registerCycleTime = jsonObject.configuration.registerCycle;
  if (registerCycleTime !== null && registerCycleTime > 0) {
    // initiate a new Thread
    let first = true;
    logger.debug(`Starting auto register thread for grid. Will try to register every ${registerCycleTime} ms.`);
    setInterval(async function registerRetry () {
      if (first !== true) {
        let isRegistered = await isAlreadyRegistered(jsonObject);
        if (isRegistered !== null && isRegistered !== true) {
          // make the http POST to the grid for registration
          await registerToGrid(post_options, jsonObject);
        }
      } else {
        first = false;
        await registerToGrid(post_options, jsonObject);
      }
    }, registerCycleTime);
  }
}

async function isAlreadyRegistered (jsonObject) {
  //check if node is already registered
  let id = jsonObject.configuration.id;
  try {
    const {data, status} = await axios({
      url: `${hubUri(jsonObject.configuration)}/grid/api/proxy?id=${id}`,
      timeout: 10000,
    });
    if (status !== 200) {
      throw new Error(`Request failed with code ${status}`);
    }
    if (data.success !== true) {
      // if register fail, print the debug msg
      logger.debug(`Grid registration error: ${data.msg}`);
    }
    return data.success;
  } catch (err) {
    logger.debug(`Hub down or not responding: ${err.message}`);
  }
}


export default registerNode;
