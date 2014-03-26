'use strict';

var Q = require('q'),
    exec = Q.denodeify(require('child_process').exec);

function packageJson(pkg) {
  return exec('npm view --json ' + pkg).then(function (res) {
    return JSON.parse(res[0]);
  });
}

function gitUrl(pkg) {
  return packageJson(pkg)
    .then(function (json) {
      if (json.repository.type !== 'git') throw new  Error('Not a git repo');
      return json.repository.url;
    });
}

function liveTag(pkg) {
  return packageJson(pkg)
    .then(function (json) {
      return "v" + json.version;
    });
}

var cmd = process.argv[2];
var pkg = process.argv[3];

switch (cmd) {
  case 'git-url':
    gitUrl(pkg)
      .then(function (url) {
        console.log(url);
      }).done();
    break;
  case 'live-tag':
    liveTag(pkg)
      .then(function (tag) {
        console.log(tag);
      }).done();
    break;
  default:
    throw new Error('Unknown command');
}
