'use strict';

var Q = require('q'),
    exec = Q.denodeify(require('child_process').exec);

function packageJson() {
  return new Q(require("../package.json"));
}

function packageJsonVersion(pkg) {
  return packageJson().then(function (json) {
    return json.dependencies[pkg];
  });
}

function localPackageFullName(pkg) {
  return packageJsonVersion(pkg)
    .then(function (version) {
      pkg = pkg + '@' + version;
      return exec('npm view ' + pkg + ' name').then(function (res) {
        var m = res[0].match(/[^\s]+@[^\s]+/gm);
        return m[m.length - 1];
      });
    });
}

function npmViewAsJson(pkg) {
  return exec('npm view --json ' + pkg).then(function (res) {
    return JSON.parse(res[0]);
  });
}

function latestGitUrl(pkg) {
  return npmViewAsJson(pkg)
    .then(function (json) {
      if (json.repository.type !== 'git') throw new  Error('Not a git repo');
      return json.repository.url;
    });
}

function latestTag(pkg) {
  return npmViewAsJson(pkg)
    .then(function (json) {
      return "v" + json.version;
    });
}

function localTag(pkg) {
  return localPackageFullName(pkg)
    .then(function (pkg) { return npmViewAsJson(pkg); })
    .then(function (json) {
      return "v" + json.version;
    });
}

function localGitUrl(pkg) {
  return localPackageFullName(pkg)
    .then(function (pkg) { return npmViewAsJson(pkg); })
    .then(function (json) {
      if (json.repository.type !== 'git') throw new  Error('Not a git repo');
      return json.repository.url;
    });
}

var cmd = process.argv[2];
var pkg = process.argv[3];

switch (cmd) {
  case 'local-git-url':
    localGitUrl(pkg)
      .then(function (url) {
        console.log(url);
      }).done();
    break;
  case 'local-tag':
    localTag(pkg)
      .then(function (tag) {
        console.log(tag);
      }).done();
    break;
  case 'latest-git-url':
    latestGitUrl(pkg)
      .then(function (url) {
        console.log(url);
      }).done();
    break;
  case 'latest-tag':
    latestTag(pkg)
      .then(function (tag) {
        console.log(tag);
      }).done();
    break;
  default:
    throw new Error('Unknown command');
}

