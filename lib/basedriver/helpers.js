import _ from 'lodash';
import path from 'path';
import url from 'url';
import logger from './logger';
import _fs from 'fs';
import B from 'bluebird';
import { tempDir, system, fs, util, zip } from 'appium-support';
import { exec } from 'teen_process';
import request from 'request';

const ZIP_EXTS = ['.zip', '.ipa'];
const ZIP_MIME_TYPE = 'application/zip';

async function configureApp (app, appExt, mountRoot="Volumes", windowsShareUserName="", windowsSharePassword="") {
  if (_.isNull(app) || _.isUndefined(app)) {
    // immediately shortcircuit if not given an app
    return;
  }

  let newApp = null;
  let shouldUnzipApp = false;

  // check if we're copying from a windows network share
  if (_.startsWith(app, "\\")) {
    app = await copyFromWindowsNetworkShare(app, appExt, mountRoot, windowsShareUserName, windowsSharePassword);
  }

  if ((app || '').substring(0, 4).toLowerCase() === 'http') {
    logger.info(`Using downloadable app '${app}'`);
    let {targetPath, contentType} = await downloadApp(app, appExt);
    newApp = targetPath;
    // the filetype may not be obvious for certain urls, so check the mime type too
    shouldUnzipApp = _.includes(ZIP_EXTS, path.extname(newApp)) || contentType === ZIP_MIME_TYPE;
    logger.info(`Downloaded app to '${newApp}'`);
  } else {
    logger.info(`Using local app '${app}'`);
    shouldUnzipApp = _.includes(ZIP_EXTS, path.extname(app));
    newApp = shouldUnzipApp ? await copyLocalZip(app) : app;
  }

  if (shouldUnzipApp) {
    newApp = await unzipApp(newApp, appExt);
    logger.info(`Unzipped local app to '${newApp}'`);
  }

  if (path.extname(newApp) !== appExt) {
    throw new Error(`New app path ${newApp} did not have extension ${appExt}`);
  }

  return newApp;
}

async function downloadApp (app, appExt) {
  let appUrl;
  try {
    appUrl = url.parse(app);
  } catch (err) {
    throw new Error(`Invalid App URL (${app})`);
  }

  // check if this is zipped
  let isZipFile = _.includes(ZIP_EXTS, path.extname(appUrl.pathname));
  appExt = isZipFile ? '.zip' : appExt;

  let downloadedApp;
  try {
    downloadedApp = await downloadFile(url.format(appUrl), appExt);
  } catch (err) {
    throw new Error(`Problem downloading app from url ${app}: ${err}`);
  }

  return downloadedApp;
}

async function downloadFile (sourceUrl, suffix) {
  // We will be downloading the files to a directory, so make sure it's there
  // This step is not required if you have manually created the directory
  let targetPath = await tempDir.path({prefix: 'appium-app', suffix});
  let contentType;

  // don't use request-promise here, we need streams
  await new B((resolve, reject) => {
    request(sourceUrl)
      .on('error', reject) // handle real errors, like connection errors
      .on('response', function (res) {
        // handle responses that fail, like 404s
        if (res.statusCode >= 400) {
          reject(`Error downloading file: ${res.statusCode}`);
        }
        contentType = res.headers['content-type'];
      })
      .pipe(_fs.createWriteStream(targetPath))
      .on('error', reject)
      .on('close', resolve);
  });
  logger.debug(`${sourceUrl} downloaded to ${targetPath}`);
  logger.debug(`Downloaded file type '${contentType}'`);
  return {targetPath, contentType};
}

async function copyLocalZip (localZipPath) {
  logger.debug('Copying local zip to tmp dir');
  if (!(await fs.exists(localZipPath))) {
    throw new Error('Local zip did not exist');
  }
  let fileInfo = await tempDir.open({prefix: 'appium-app', suffix: '.zip'});
  let infile = _fs.createReadStream(localZipPath);
  let outfile = _fs.createWriteStream(fileInfo.path);
  return new B((resolve, reject) => {
    infile.pipe(outfile).on('close', () => {
      resolve(fileInfo.path);
    }).on('error', (err) => { // eslint-disable-line promise/prefer-await-to-callbacks
      reject(err);
    });
  });
}

async function unzipApp (zipPath, appExt) {
  // first delete any existing apps that might be in our tmp dir
  let {stdout} = await exec('find', [path.dirname(zipPath), '-type', 'd',
                                     '-name', `*${appExt}`]);
  for (let line of stdout.trim().split('\n').filter(Boolean)) {
    await fs.rimraf(line);
  }
  // now delete any existing zip payload
  await fs.rimraf(path.resolve(path.dirname(zipPath), 'Payload*'));
  let output = await unzipFile(zipPath);
  let relaxedRegStr = `(?:creating|inflating|extracting): (.+${appExt})/?`;
  // in the strict regex, we check for an entry which ends with the
  // extension
  let strictReg = new RegExp(`${relaxedRegStr}$`, 'm');
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
    logger.debug('Got a relaxed match for app in zip, be careful for app match errors');
    return getAppPath(relaxedMatch);
  }

  throw new Error(`App zip unzipped OK, but we could not find a ${appExt} bundle ` +
                  `in it. Make sure your archive contains the ${appExt} package ` +
                  `and nothing else`);
}

async function unzipFile (zipPath) {
  logger.debug(`Unzipping ${zipPath}`);
  let valid = await testZipArchive(zipPath);
  if (!valid) {
    throw new Error(`Zip archive ${zipPath} did not test valid`);
  }

  if (system.isWindows()) {
    await zip.extractAllTo(zipPath, path.dirname(zipPath));
    logger.debug('Unzip successful');
    return;
  }

  let execEnv = _.clone(process.env);
  delete execEnv.UNZIP;
  let execOpts = {cwd: path.dirname(zipPath), env: execEnv};
  try {
    let {stdout} = await exec('unzip', ['-o', zipPath], execOpts);
    return stdout;
  } catch (err) {
    logger.error(`Unzip threw error ${err}`);
    logger.error(`Stderr: ${err.stderr}`);
    logger.error(`Stdout: ${err.stdout}`);
    throw new Error('Archive could not be unzipped, check appium logs.');
  }
}

async function testZipArchive (zipPath) {
  logger.debug(`Testing zip archive: ${zipPath}`);
  if (system.isWindows()) {
    if (await fs.exists(zipPath)) {
      logger.debug('Zip archive tested clean');
      return true;
    } else {
      logger.debug('Zip archive not found');
      return false;
    }
  }

  let execEnv = _.clone(process.env);
  delete execEnv.UNZIP;
  let execOpts = {cwd: path.dirname(zipPath), env: execEnv};
  let output;
  try {
    output = await exec('unzip', ['-tq', zipPath], execOpts);
    if (/No errors detected/.exec(output.stdout)) {
      return true;
    }
    logger.error(`Zip file ${zipPath} was not valid`);
    logger.error(`Stderr: ${output.stderr}`);
    logger.error(`Stdout: ${output.stdout}`);
    logger.error('Zip archive did not test successfully, check appium server ' +
                 'logs for output');
    return false;
  } catch (err) {
    logger.error(`Test zip archive threw error ${err}`);
    logger.error(`Stderr: ${err.stderr}`);
    logger.error(`Stdout: ${err.stdout}`);
    throw new Error('Error testing zip archive, are you sure this is a zip file?');
  }
}

async function copyFromWindowsNetworkShare (app, appExt, mountRoot, windowsUserName, windowsPassword) {
  if (system.isWindows()) {
    return await copyLocallyFromWindowsShare(app, appExt);
  } else {
    return await mountWindowsShareOnMac(app, mountRoot, windowsUserName, windowsPassword);
  }
}

async function mountWindowsShareOnMac (app, mountRoot, windowsUserName, windowsPassword) {
  let pathSplit = app.split("\\");
  let networkShare = pathSplit[2];
  let rootFolder = pathSplit[3];
  app = app.replace(/\\/g, "/");
  app = app.replace(`/${networkShare}`, mountRoot);
  let mountPath = `/${mountRoot}/${rootFolder}`;

  let mountNetworkShare = async function () {
    await fs.mkdir(mountPath);
    let mountArgs = [`-t`, `smbfs`, `${windowsUserName}:${windowsPassword}@${networkShare}/${rootFolder}`, mountPath];
    try {
      await exec('mount', mountArgs);
    } catch (err) {
      logger.errorAndThrow(`Error mounting: ${err.message}`);
    }
  };

  if (await fs.exists(mountPath)) {
    if (await fs.exists(app)) {
      return app;
    }
    let umountArgs = [mountPath];
    try {
      await exec('umount', umountArgs);
    } catch (err) {
      logger.error(`Error Unmounting :${err.message}`);
    }
    await fs.rimraf(mountRoot);
  }
  await mountNetworkShare();
  return app;
}

async function copyLocallyFromWindowsShare (app, appExt) {
  let fileInfo = await tempDir.open({prefix: 'appium-app', suffix: appExt});
  return await fs.copyFile(app, fileInfo.path);
}

function isPackageOrBundle (app) {
  return (/^([a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+)+$/).test(app);
}

function getCoordDefault (val) {
  // going the long way and checking for undefined and null since
  // we can't be assured `elId` is a string and not an int. Same
  // thing with destElement below.
  return util.hasValue(val) ? val : 0.5;
}

function getSwipeTouchDuration (waitGesture) {
  // the touch action api uses ms, we want seconds
  // 0.8 is the default time for the operation
  let duration = 0.8;
  if (typeof waitGesture.options.ms !== 'undefined' && waitGesture.options.ms) {
    duration = waitGesture.options.ms / 1000;
    if (duration === 0) {
      // set to a very low number, since they wanted it fast
      // but below 0.1 becomes 0 steps, which causes errors
      duration = 0.1;
    }
  }
  return duration;
}

export default { configureApp, downloadApp, downloadFile, copyLocalZip,
                 unzipApp, unzipFile, testZipArchive, isPackageOrBundle,
                 getCoordDefault, getSwipeTouchDuration, copyFromWindowsNetworkShare };
