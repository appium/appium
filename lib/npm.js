import _ from 'lodash';
import path from 'path';
import { exec } from 'teen_process';

const APPIUM_ROOT = path.resolve(__dirname, '..', '..');

async function npmExec (cmd, args, {json} = {json: false}, execOpts = {}) {
  args.unshift(cmd);
  if (json) {
    args.push('-json');
  }
  execOpts.cwd = APPIUM_ROOT;
  const {stdout, stderr, code} = await exec('npm', args, execOpts);
  const ret = {stdout, stderr, code, json: null};

  if (json) {
    // if possible, parse NPM's json output. During NPM install 3rd-party
    // packages can write to stdout, so sometimes the json output can't be
    // guaranteed to be parseable
    try {
      ret.json = JSON.parse(stdout);
    } catch (ign) {}
  }

  return ret;
}

async function getLatestVersion (pkg) {
  return (await npmExec('view', [pkg, 'dist-tags'], {json: true})).json.latest;
}

async function installPackage (pkg, ver) {
  const res = await npmExec('install', [
    '--no-save',
    '--no-package-lock',
    ver ? `${pkg}@${ver}` : pkg
  ], {json: true});

  // eventually we need to know the npm package name so we can get its
  // package.json, but if we're installing from github, we don't know that yet.
  // as a first pass, assume the package name is the last component of the
  // package which we're sending to npm install.
  let pkgName = path.basename(pkg);

  if (res.json) {
    // we parsed a valid json response, so if we got an error here, return that
    // message straightaway
    if (res.json.error) {
      throw new Error(res.json.error);
    }

    // if we tried to install a package via git/github, we might not have been
    // certain of the package name, so if we can retrieve it unambiguously from
    // the json report of the install, do so
    const names = _.uniq(res.json.added.concat(res.json.updated).map(x => x.name));
    if (names.length === 1) {
      pkgName = names[0];
    }
  }

  // Now read package data from the installed package to return, and make sure
  // everything got installed ok
  const pkgJson = path.resolve(APPIUM_ROOT, 'node_modules', pkgName, 'package.json');
  try {
    return require(pkgJson);
  } catch {
    throw new Error('The package was not downloaded correctly; its package.json ' +
                    'did not exist or was unreadable. We looked for it at ' +
                    pkgJson);
  }
}

async function linkPackage (pkgPath) {
  // from the path alone we don't know the npm package name, so we need to
  // look in package.json
  let pkgName;
  try {
    pkgName = require(path.resolve(pkgPath, 'package.json')).name;
  } catch {
    throw new Error('Could not find package.json inside the package path ' +
                    `provided: ${pkgPath}`);
  }

  const res = await npmExec('link', [pkgPath]);
  if (res.json && res.json.error) {
    throw new Error(res.json.error);
  }

  // now ensure it was linked to the correct place
  try {
    return require(path.resolve(APPIUM_ROOT, 'node_modules', pkgName, 'package.json'));
  } catch {
    throw new Error('The package was not linked correctly; its package.json ' +
                    'did not exist or was unreadable');
  }
}

export {
  getLatestVersion,
  installPackage,
  linkPackage,
};
