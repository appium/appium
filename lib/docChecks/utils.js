import B from 'bluebird';
import path from 'path';
import _inquirer from 'inquirer';
import log from '../logger';
import authorize from 'authorize-ios';

let pkgRoot = process.env.NO_PRECOMPILE ?
  path.resolve(__dirname, '..') : path.resolve(__dirname, '..', '..');

let ok = (message) => { return {ok: true, message}; };
let nok = (message) => { return {ok: false, message}; };

let inquirer = {
  prompt: B.promisify(function (question, cb) {
    _inquirer.prompt(question, function (resp) { cb(null, resp); });
  })
};

function configureBinaryLog (opts) {
  let actualLog = log.unwrap().log;
  log.unwrap().log = function (level, prefix, msg) {
    let l = this.levels[level];
    if (l < this.levels[this.level]) return;
    actualLog(level, prefix, msg);
  };
  log.level = opts.debug ? 'debug' : 'info';
}

export { pkgRoot, ok, nok, inquirer, configureBinaryLog, authorize };
