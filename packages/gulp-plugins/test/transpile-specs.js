'use strict';

import B from 'bluebird';
import cp from 'child_process';
import fs from 'fs';
import _ from 'lodash';
import log from 'fancy-log';

// XXX: this behavior is unsupported by Node.js (but is supported by Babel).
// fix if dropping babel
const GULP = require.resolve('gulp/bin/gulp');
const MOCHA = require.resolve('mocha/bin/mocha');

const readFile = B.promisify(fs.readFile);

// we do not care about exec errors
async function exec(...args) {
  return await new B(function (resolve) {
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    cp.exec(args.join(' '), function (err, stdout, stderr) {
      resolve([stdout, stderr]);
    });
  });
}

// some debug
function print(stdout, stderr) {
  if (process.env.VERBOSE) {
    if ((stdout || '').length) {
      log(`stdout --> '${stdout}'`);
    }
    if ((stderr || '').length) {
      log(`stderr --> '${stderr}'`);
    }
  }
}

describe('transpile-specs', function () {
  this.timeout(60000);
  this.retries(0);

  const tests = {
    es7: {
      classFile: 'a',
      throwFile: 'a-throw.es7.js:7',
      throwTestFile: 'a-throw-specs.es7.js:8',
    },
  };

  for (const [name, files] of _.toPairs(tests)) {
    it(`should transpile ${name} fixtures`, async function () {
      const [stdout, stderr] = await exec(`${GULP} transpile-${name}-fixtures`);
      print(stdout, stderr);
      stderr.should.eql('');
      stdout.should.include('Finished');

      const fixture = require.resolve(`../../build-fixtures/lib/${files.classFile}.js`);
      const content = await readFile(fixture, 'utf8');
      content.should.have.length.above(0);
      content.should.include('sourceMapping');
    });

    describe('check transpiled', function () {
      it(`should be able to run transpiled ${name} code`, async function () {
        const fixture = require.resolve(`../../build-fixtures/lib/${files.classFile}-run.js`);
        const [stdout, stderr] = await exec(`${process.execPath} ${fixture}`);
        print(stdout, stderr);
        stderr.should.equal('');
        stdout.should.include('hello world!');
      });

      it(`should be able to run transpiled ${name} tests`, async function () {
        const fixture = require.resolve(`../../build-fixtures/test/${files.classFile}-specs.js`);
        const [stdout, stderr] = await exec(`${MOCHA} ${fixture}`);
        print(stdout, stderr);
        stderr.should.equal('');
        stdout.should.include('1 passing');
      });

      it(`should use sourcemap when throwing (${name})`, async function () {
        const fixture = require.resolve(`../../build-fixtures/lib/${files.classFile}-throw.js`);
        const [stdout, stderr] = await exec(`${process.execPath} ${fixture}`);
        print(stdout, stderr);
        let output = stdout + stderr;
        output.should.include('This is really bad!');
        output.should.include(files.throwFile);
      });

      it(`should use sourcemap when throwing within mocha (${name})`, async function () {
        const fixture = require.resolve(
          `../../build-fixtures/test/${files.classFile}-throw-specs.js`
        );
        const [stdout, stderr] = await exec(`${MOCHA} ${fixture}`);
        print(stdout, stderr);
        let output = stdout + stderr;
        output.should.include('This is really bad!');
        output.should.include(files.throwTestFile);
      });

      it(`should be able to use gulp-mocha (${name})`, async function () {
        const [stdout, stderr] = await exec(`${GULP} test-${name}-mocha`);
        print(stdout, stderr);
        stderr.should.eql('');
        stdout.should.include('Finished');
      });

      it(`should use sourcemap when throwing within gulp-mocha (${name})`, async function () {
        const [stdout, stderr] = await exec(`${GULP} --no-notif test-${name}-mocha-throw`);
        print(stdout, stderr);
        let output = stdout + stderr;
        output.should.include('This is really bad!');
        output.should.include(files.throwTestFile);
      });
    });
  }

  // TypeScript will not compile such errors, so no need to test
  it('should not detect a rtts-assert error', async function () {
    const fixture = require.resolve('../../build-fixtures/lib/a-rtts-assert-error.js');
    const [stdout, stderr] = await exec(`${process.execPath} ${fixture}`);
    print(stdout, stderr);
    stderr.should.equal('');
    stdout.should.include('123');
    stdout.should.not.include('Invalid arguments given!');
  });
});
