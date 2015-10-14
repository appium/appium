import B from 'bluebird';
import _fs from 'fs';
import path from 'path';
import _inquirer from 'inquirer';
import log from '../lib/logger';
import authorize from 'authorize-ios';

let pkgRoot = process.env.NO_PRECOMPILE ?
  path.resolve(__dirname, '..') : path.resolve(__dirname, '..', '..');

let fs = {
  readFile: B.promisify(_fs.readFile),
  exists: B.promisify((f, cb) => {
    _fs.exists(f, function (res) { cb(null, res);});
  }),
  lstat: B.promisify(_fs.lstat)
};

let ok = (message) => { return {ok: true, message: message }; };
let nok = (message) => { return {ok: false, message: message }; };

let inquirer = {
  prompt: B.promisify(function(question, cb) {
    _inquirer.prompt(question, function(resp) { cb(null, resp); });
  })
};

function configureBinaryLog(opts) {
  log.unwrap().log = function (level, prefix, message) {
    let l = this.levels[level];
    if (l < this.levels[this.level]) return;
    console.log(message);
  };
  log.level = opts.debug ? 'debug' : 'info';
}

export { pkgRoot, fs, ok, nok, inquirer, configureBinaryLog, authorize };
