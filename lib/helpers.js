import _ from 'lodash';
import path from 'path';
import url from 'url';
import logger from './logger';
import _fs from 'fs';
import B from 'bluebird';
import { tempDir, system, util } from 'appium-support';
import { exec } from 'teen_process';
import AdmZip from 'adm-zip';
import request from 'request-promise';

const fs = {
  stat: B.promisify(_fs.stat),
  writeFile: B.promisify(_fs.stat)
};

const ZIP_EXTS = ['.zip', '.ipa'];

let helpers = {};

helpers.configureApp = async function (app, appExt) {
  let tempFiles = [];
  let newApp = null;
  let shouldUnzipApp = _.contains(ZIP_EXTS, path.extname(app));
  if (app.substring(0, 4).toLowerCase() === "http") {
    logger.info(`Using downloadable app ${app}`);
    newApp = await downloadApp(app, shouldUnzipApp ? ".zip" : appExt);
    logger.info(`Downloaded app to ${newApp}`);
  } else {
    logger.info(`Using local app ${app}`);
    newApp = app;
    if (shouldUnzipApp) {
      newApp = await copyLocalZip(app);
    }
  }

  if (shouldUnzipApp) {
    tempFiles.push(newApp);
    newApp = await unzipApp(newApp, appExt);
    tempFiles.push(newApp);
    logger.info(`Unzipped local app to ${newApp}`);
  }

  if (path.extname(newApp) !== appExt) {
    throw new Error(`New app path ${newApp} did not have extension ${appExt}`);
  }

  return tempFiles;
};

async function downloadApp (app, appExt) {
  let appUrl;
  try {
    appUrl = url.parse(app);
  } catch (err) {
    throw new Error(`Invalid App URL (${app})`);
  }

  let appPath;
  try {
    appPath = await downloadFile(url.format(appUrl), appExt);
  } catch (err) {
    throw new Error(`Problem downloading app from url ${app}: ${err}`);
  }

  return appPath;
}

async function downloadFile (fileUrl, suffix) {
  // We will be downloading the files to a directory, so make sure it's there
  // This step is not required if you have manually created the directory
  let fileInfo = await tempDir.open({prefix: 'appium-app', suffix: suffix});
  _fs.close(fileInfo.fd);
  await fs.writeFile(fileInfo.path, await request(fileUrl));
  logger.debug(`${fileUrl} downloaded to ${fileInfo.path}`);
}

async function copyLocalZip (localZipPath) {
  logger.debug("Copying local zip to tmp dir");
  await fs.stat(localZipPath);
  let fileInfo = await tempDir.open({prefix: 'appium-app', suffix: '.zip'});
  let infile = _fs.createReadStream(localZipPath);
  let outfile = _fs.createWriteStream(fileInfo.path);
  await B.promisify(infile.pipe(outfile).on)('close');
  return fileInfo.path;
}

async function unzipApp (zipPath, appExt) {
  await exec('find', [path.dirname(zipPath), '-type', 'd', '-name',
                      `'*${appExt}'`, '|', 'xargs', 'rm', '-rf',
                      path.dirname(zipPath), '/Payload*']);
  let output = await unzipFile(zipPath);
  let relaxedRegStr = `(?:creating|inflating|extracting): (.+${appExt})/?`;
  // in the strict regex, we check for an entry which ends with the
  // extension
  let strictReg = new RegExp(relaxedRegStr + "$", 'm');
  // otherwise, we allow an entry which contains the extension, but we
  // need to be careful, because it might be a false positive
  let relaxedReg = new RegExp(relaxedRegStr, 'm');
  let strictMatch = strictReg.exec(output);
  let relaxedMatch = relaxedReg.exec(output);
  let getAppPath = function (match) {
    return path.resolve(path.dirname(zipPath), match[1]);
  };

  if (strictMatch) {
    return getAppPath(strictMatch);
  }

  if (relaxedMatch) {
    logger.debug("Got a relaxed match for app in zip, be careful for app match errors");
    return getAppPath(relaxedMatch);
  }

  throw new Error("App zip unzipped OK, but we couldn't find a .app bundle " +
                  "in it. Make sure your archive contains the .app package " +
                  "and nothing else");
}

async function unzipFile (zipPath) {
  logger.debug(`Unzipping ${zipPath}`);
  let valid = await testZipArchive(zipPath);
  if (!valid) {
    throw new Error(`Zip archive ${zipPath} did not test valid`);
  }

  if (system.isWindows()) {
    let zip = new AdmZip(zipPath);
    zip.extractAllTo(path.dirname(zipPath), true);
    logger.debug("Unzip successful");
    return;
  }

  let execEnv = _.clone(process.env);
  delete execEnv.UNZIP;
  let execOpts = {cwd: path.dirname(zipPath), env: execEnv};
  try {
    await exec('unzip', ['-o', zipPath], execOpts);
  } catch (err) {
    logger.error(`Unzip threw error ${err}`);
    logger.error(`Stderr: ${err.stderr}`);
    logger.error(`Stdout: ${err.stdout}`);
    throw new Error("Archive could not be unzipped, check appium logs.");
  }
}

async function testZipArchive (zipPath) {
  logger.debug(`Testing zip archive: ${zipPath}`);
  if (system.isWindows()) {
    if (await util.exists(zipPath)) {
      logger.debug("Zip archive tested clean");
      return true;
    } else {
      logger.debug("Zip archive not found");
      return false;
    }
  }

  let execEnv = _.clone(process.env);
  delete execEnv.UNZIP;
  let execOpts = {cwd: path.dirname(zipPath), env: execEnv};
  let output;
  try {
    output = await exec('unzip', ['-tq'], execOpts);
    if (/No errors detected/.exec(output.stderr)) {
      return true;
    }
    logger.error(`Zip file ${zipPath} was not valid`);
    logger.error(`Stderr: ${output.stderr}`);
    logger.error(`Stdout: ${output.stdout}`);
    logger.error("Zip archive did not test successfully, check appium server " +
                 "logs for output");
    return false;
  } catch (err) {
    logger.error(`Test zip archive threw error ${err}`);
    logger.error(`Stderr: ${err.stderr}`);
    logger.error(`Stdout: ${err.stdout}`);
    throw new Error("Error testing zip archive, are you sure this is a zip file?");
  }
}

export default helpers;
