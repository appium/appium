import _ from 'lodash';
import path from 'path';
import { exec } from 'teen_process';
import { util } from 'appium-support';

const INSTALL_LOCKFILE = '.appium.install.lock';
const LINK_LOCKFILE = '.appium.link.lock';

async function npmExec (cmd, args, opts, execOpts = {}) {
  const { appiumHome, json, lockFile } = opts;
  if (!appiumHome) {
    throw new Error('appiumHome was not provided to npmExec');
  }
  execOpts.cwd = appiumHome;

  args.unshift(cmd);
  if (json) {
    args.push('-json');
  }
  let runner = async () => await exec('npm', args, execOpts);
  if (lockFile) {
    const acquireLock = util.getLockFileGuard(path.resolve(appiumHome, lockFile));
    const _runner = runner;
    runner = async () => await acquireLock(_runner);
  }
  const {stdout, stderr, code} = await runner();
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

async function getLatestVersion (appiumHome, pkg) {
  return (await npmExec('view', [pkg, 'dist-tags'], {
    json: true,
    appiumHome
  })).json.latest;
}

async function installPackage (appiumHome, pkg, ver) {
  const res = await npmExec('install', [
    '--no-save',
    '--no-package-lock',
    ver ? `${pkg}@${ver}` : pkg
  ], {
    appiumHome,
    json: true,
    lockFile: INSTALL_LOCKFILE
  });

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
    const names = _.uniq([...res.json.added, ...res.json.updated].map((x) => x.name));
    if (names.length === 1) {
      pkgName = names[0];
    }
  }

  // Now read package data from the installed package to return, and make sure
  // everything got installed ok
  const pkgJson = path.resolve(appiumHome, 'node_modules', pkgName, 'package.json');
  try {
    return require(pkgJson);
  } catch {
    throw new Error('The package was not downloaded correctly; its package.json ' +
                    'did not exist or was unreadable. We looked for it at ' +
                    pkgJson);
  }
}

async function linkPackage (appiumHome, pkgPath) {
  // from the path alone we don't know the npm package name, so we need to
  // look in package.json
  let pkgName;
  try {
    pkgName = require(path.resolve(pkgPath, 'package.json')).name;
  } catch {
    throw new Error('Could not find package.json inside the package path ' +
                    `provided: ${pkgPath}`);
  }

  const res = await npmExec('link', [pkgPath], {appiumHome, lockFile: LINK_LOCKFILE});
  if (res.json && res.json.error) {
    throw new Error(res.json.error);
  }

  // now ensure it was linked to the correct place
  try {
    return require(path.resolve(appiumHome, 'node_modules', pkgName, 'package.json'));
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
