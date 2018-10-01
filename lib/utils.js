import B from 'bluebird';
import path from 'path';
import _inquirer from 'inquirer';
import log from '../lib/logger';
import authorize from 'authorize-ios';


// rename to make more sense
const authorizeIos = authorize;

const pkgRoot = process.env.NO_PRECOMPILE ?
  path.resolve(__dirname, '..') : path.resolve(__dirname, '..', '..');

const ok = (message) => { return {ok: true, message}; };
const nok = (message) => { return {ok: false, message}; };

const inquirer = {
  prompt: B.promisify(function (question, cb) { // eslint-disable-line promise/prefer-await-to-callbacks
    _inquirer.prompt(question, function (resp) { cb(null, resp); }); // eslint-disable-line promise/prefer-await-to-callbacks
  })
};

function configureBinaryLog (opts) {
  let actualLog = log.unwrap().log;
  log.unwrap().log = function (level, prefix, msg) {
    let l = this.levels[level];
    if (l < this.levels[this.level]) return; // eslint-disable-line curly
    actualLog(level, prefix, msg);
  };
  log.level = opts.debug ? 'debug' : 'info';
}

export { pkgRoot, ok, nok, inquirer, configureBinaryLog, authorizeIos, };
