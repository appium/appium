import request from 'request-promise';
import { fs } from 'appium-support';
import logger from './logger';


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
  await postRequest(data, addr, port);
}

async function registerToGrid (options_post, jsonObject) {
  try {
    let response = await request(options_post);
    if (response === undefined || response.statusCode !== 200) {
      throw new Error('Request failed');
    }
    let logMessage = `Appium successfully registered with the grid on ${jsonObject.configuration.hubHost}:${jsonObject.configuration.hubPort}`;
    logger.debug(logMessage);
  } catch (err) {
    logger.error(`Request to register with grid was unsuccessful: ${err.message}`);
  }
}

async function postRequest (data, addr, port) {
  // parse json to get hub host and port
  let jsonObject;
  try {
    jsonObject = JSON.parse(data);
  } catch (err) {
    logger.errorAndThrow(`Syntax error in node configuration file: ${err.message}`);
  }

  // Move Selenium 3 configuration properties to configuration object
  if (!jsonObject.hasOwnProperty('configuration')) {
    let configuration = {};
    for (var property in jsonObject) {
      if (jsonObject.hasOwnProperty(property) && property !== 'capabilities') {
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

  // re-serialize the configuration with the auto populated data
  data = JSON.stringify(jsonObject);

  // prepare the header
  let post_headers = {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  };
  // the post options
  let post_options = {
    url: `http://${jsonObject.configuration.hubHost}:${jsonObject.configuration.hubPort}/grid/register`,
    method: 'POST',
    body: data,
    headers: post_headers,
    resolveWithFullResponse: true // return the full response, not just the body
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
    setInterval(async function () {
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
    let response = await request({
      uri: `http://${jsonObject.configuration.hubHost}:${jsonObject.configuration.hubPort}/grid/api/proxy?id=${id}`,
      method  : 'GET',
      timeout : 10000,
      resolveWithFullResponse: true // return the full response, not just the body
    });
    if (response === undefined || response.statusCode !== 200) {
      throw new Error(`Request failed`);
    }
    let responseData = JSON.parse(response.body);
    if (responseData.success !== true) {
      // if register fail, print the debug msg
      logger.debug(`Grid registration error: ${responseData.msg}`);
    }
    return responseData.success;
  } catch (err) {
    logger.debug(`Hub down or not responding: ${err.message}`);
  }
}


export default registerNode;
