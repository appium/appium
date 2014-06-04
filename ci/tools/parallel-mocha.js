'use strict';

var args = process.argv.slice(2),
    _ = require('underscore'),
    glob = require('glob'),
    async = require('async'),
    Q = require("q"),
    spawn = require('child_process').spawn,
    argparse = require('argparse');


var parser = new argparse.ArgumentParser({
  description: 'Parallel Mocha'
});
parser.addArgument(
  [ '-p' ],
  {
    help: 'number of processes',
    type: 'int',
    required: true,
    dest: 'numOfWorkers'
  }
);
parser.addArgument(
  [ '-c' ],
  {
    help: 'test config',
    required: true,
    dest: 'config'
  }
);
var args = parser.parseArgs();

var config = require('../test-glob-config');

var fileInfos = config[args.config];
if (!(fileInfos instanceof Array)) {
  fileInfos = [fileInfos];
}

var allGood = true;

function runOne(mochaBin, filepath) {
  var deferred = Q.defer();
  var out = '';
  var child = spawn(mochaBin, [filepath]);
  child.on('error', function (err) {
    deferred.reject(err);
  });

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', function (data) {
    out += data;
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', function (data) {
    out += data;
  });
  child.on('close', function (code) {
    if (code !== 0) {
      var err = new Error(
      "Mocha process terminated with code: " + code + '.');
      err.out = out;
      return deferred.reject(err);
    }
    deferred.resolve(out);
  });
  return deferred.promise;
}

var queue = async.queue(function (task, done) {
  var startMs = Date.now();
  console.log('running ' + task.filepath);

  var interval = setInterval(function () {
    console.log(task.filepath, 'has been running for',
      Math.round((Date.now() - startMs)/1000), 'seconds.');
  }, 300000);

  runOne(task.mochaBin, task.filepath)
    .then(function (out) {
      console.log('finished to run', task.filepath,'\n', out);
    })
    .catch(function (err) {
      allGood = false;
      console.error(err + (err.out ? '\n' + err.out : ''));
    }).finally(function () { clearInterval(interval); })
    .nodeify(done);
}, args.numOfWorkers);

queue.drain = function () {
  if (allGood) {
    console.log('\n\nALL GOOD\n\n');
    process.exit(0);
  }
  else {
    throw new Error('FAILING TESTS!');
  }
};

function fillQueue(fileInfo) {
  var deferred = Q.defer();
  async.eachSeries(
    fileInfo['glob-patterns'],
    function (globPattern, done) {
    glob(globPattern, function (err, _files) {
        if (err) return done(err);
        _(_files).map(function (file) {
          queue.push({mochaBin: fileInfo['mocha-bin'], filepath: file});
        });
        done();
      });
    },
    function (err) {
      if (err) {
        return deferred.reject(err);
      }
      deferred.resolve();
    }
  );
  return deferred.promise;
}

queue.pause();
Q.all(_(fileInfos).map(function (fileInfo) {
    return fillQueue(fileInfo);
  })).then(function () { queue.resume(); })
  .done();
