import {fs} from '@appium/support';
import nodePath from 'path';
import axios from 'axios';
import path from 'path';
import logger from './logger';
import util from 'util';
import { exec } from 'child_process';
import {
    type ResponseType
  } from 'axios';

async function getLocalAppsFolder() {
    if(process.env.APPIUM_APPS_DIR === undefined || process.env.APPIUM_APPS_DIR === '')
        return undefined;
    else
        return process.env.APPIUM_APPS_DIR;
}

async function getSharedFolderForAppUrl(url) {
    const sub = await getLocalFileForAppUrl(url);

    const lastSlashInd = sub.lastIndexOf(path.sep);
    var targetPath;
    if(lastSlashInd != -1) {
        targetPath = sub.substring(0, lastSlashInd);
    } else {
        targetPath = '';
    }

    logger.info(`[MCLOUD] Target path [getSharedFolderForAppUrl]: ${targetPath}`)
    const folderExists = await fs.exists(targetPath);
    if(!folderExists)
        await fs.mkdir(targetPath, {recursive : true});
    return targetPath;
}
exports.getSharedFolderForAppUrl = getSharedFolderForAppUrl;
async function getLocalFileForAppUrl(url) {
    var sub = url.substring(url.indexOf('//') + 2)
    sub = sub.substring(sub.indexOf('/'));
    if(sub.includes('?')) {
        sub = sub.substring(0, sub.indexOf('?'));
    }
    sub = sub.replace(/\//g, path.sep);

    const targetPath = nodePath.join(await getLocalAppsFolder() as string, sub);
    logger.info(`[MCLOUD] Target path [getLocalFileForAppUrl]: ${targetPath}`)
    return targetPath;
}

async function getFileContentLength(remoteUrl) {
    const timeout = 10000;
    const retries = 5;
    const pollingInterval = 3000;

    const requestOpts = {
        url: remoteUrl,
        responseType: 'stream' as ResponseType,
        timeout: timeout,
    };

    // getting content-length with retry
    var lastError;
    const getLengthRequest = async () => {
        for (var i=0; i<retries; i++) {
            try {
                logger.debug(`[MCLOUD] Making GET http call for retrieving of remote app size`);
                const {
                    headers: responseHeaders,
                } = await axios(requestOpts);
                const responseLength = parseInt(responseHeaders['content-length'], 10);
                logger.debug(`[MCLOUD] CONTENT-LENGTH for the file: ${responseLength}`);
                return responseLength;
            } catch (error) {
                lastError = error;
                console.log(`[MCLOUD] Cannot fetch info about app size. Will retry attempt in ${pollingInterval}ms`);
                await new Promise(resolve => setTimeout(resolve, pollingInterval));
            }
        }
    }
    const length = await getLengthRequest();
    if(length) {
        return length;
    } else {
        throw new Error(`[MCLOUD] Cannot get file content-length from ${remoteUrl} after ${retries} retry(s): ${lastError}`);
    }
}

function executeShell(shellCommand, description) {
    exec(shellCommand, (error, stdout, stderr) => {
        if (error) {
            logger.info(`[MCLOUD] ${description} error: ${error.message}`);
            return;
        }
        if (stderr) {
            logger.info(`[MCLOUD] ${description} stderr: ${stderr}`);
            return;
        }
        logger.info(`[MCLOUD] ${description} command was successfully executed`);
      });
}

async function executeShellWPromise(shellCommand) {
    const execPromisify = util.promisify(exec);
    return await execPromisify(shellCommand);
}

async function parseWDAUrl() {
    const wdaHost = process.env.WDA_HOST;
    const wdaPort = process.env.WDA_PORT;
    return `http://${wdaHost}:${wdaPort}/status`;
}

async function getWDAStatus(wdaURL) {
    try {
        return (await axios({
          url: wdaURL,
          method: 'GET',
          timeout: 500,
        })).data;
      } catch (e) {
        logger.info(`Cannot send GET request to '${wdaURL}'. Original error: ${e.message}`);
        return undefined;
      }
}

export {
    getLocalAppsFolder,
    getSharedFolderForAppUrl,
    getLocalFileForAppUrl,
    getFileContentLength,
    executeShell,
    executeShellWPromise,
    parseWDAUrl,
    getWDAStatus
}
