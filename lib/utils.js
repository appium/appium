import B from 'bluebird';
import _fs from 'fs';
import path from 'path';
import _inquirer from 'inquirer';
import { exec } from 'teen_process';
import log from '../lib/logger';

let pkgRoot = process.env.NO_PRECOMPILE ?
  path.resolve(__dirname, '..') : path.resolve(__dirname, '..', '..');

let fs = {
  readFile: B.promisify(_fs.readFile),
  exists: B.promisify((f, cb) => {
    _fs.exists(f, function (res) { cb(null, res);});
  }),
  lstat: B.promisify(_fs.lstat)
};

async function macOsxVersion () {
  // TODO: move this to appium-support
  let stdout;
  try {
    stdout = (await exec('sw_vers', ['-productVersion'])).stdout;
  } catch (err) {
    throw new Error("Unknown SW Version Command: " + err);
  }
  for (let v of ['10.8', '10.9', '10.10']) {
    if (stdout.indexOf(v) === 0) { return v; }
  }
  throw new Error("Could not detect Mac OS X Version");
}

let ok = (message) => { return {ok: true, message: message }; };
let nok = (message) => { return {ok: false, message: message }; };

let inquirer = {
  prompt: B.promisify(function(question, cb) {
    _inquirer.prompt(question, function(resp) { cb(null, resp); });
  })
};

async function authorizeIos () {
  // TODO: the script below is clearly broken, waiting on the authorize-ios
  //       package to be published
  try {
    var authorizePath = path.resolve(__dirname, "../../bin", "authorize-ios.js");
    await exec('${process.execPath}', [authorizePath]);
  } catch (err) {
    throw new Error('Could not authorize iOS: ' + err);
  }
}

function configureBinaryLog(opts) {
  log.unwrap().log = function (level, prefix, message) {
    let l = this.levels[level];
    if (l < this.levels[this.level]) return;
    console.log(message);
  };
  log.level = opts.debug ? 'debug' : 'info';
}

export { pkgRoot, fs, macOsxVersion, ok, nok, inquirer, authorizeIos , configureBinaryLog};
