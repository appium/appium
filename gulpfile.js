/* eslint no-console:0 */
/* eslint-disable promise/prefer-await-to-callbacks */
'use strict';

// turn all logging on since we have tests that rely on npmlog logs actually
// getting sent to the handler
process.env._FORCE_LOGS = '1';

const gulp = require('gulp');
const boilerplate = require('appium-gulp-plugins').boilerplate.use(gulp);
const path = require('path');
const fs = require('fs');
const log = require('fancy-log');

// remove 'fsevents' from shrinkwrap, since it causes errors on non-Mac hosts
// see https://github.com/npm/npm/issues/2679

gulp.task('fixShrinkwrap', function fixShrinkwrap (done) {
  let shrinkwrap;
  try {
    shrinkwrap = require('./npm-shrinkwrap.json');
  } catch (err) {
    log.error('Could not find shrinkwrap; skipping fixing shrinkwrap. ' +
              `(Original error: ${err.message})`);
    return done();
  }

  if (!(shrinkwrap.dependencies || {}).fsevents) {
    return done();
  }

  delete shrinkwrap.dependencies.fsevents;
  const shrinkwrapString = JSON.stringify(shrinkwrap, null, '  ') + '\n';
  fs.writeFile('./npm-shrinkwrap.json', shrinkwrapString, done);
});

boilerplate({
  build: 'appium',
  projectRoot: __dirname,
  files: [
    '*.js',
    'lib/**/*.js',
    'test/**/*.js',
    'commands-yml/**/*.js',
    '!gulpfile.js',
  ],
  test: {
    files: ['${testDir}/**/*-specs.js']
  },
  preCommitTasks: ['eslint', 'once'],
});

// generates server arguments readme
gulp.task('docs', gulp.series(['transpile']), function parseDocs () {
  const parser = require('./build/lib/parser.js');
  const appiumArguments = parser.getParser().rawArgs;
  const docFile = path.resolve(__dirname, 'docs/en/writing-running-appium/server-args.md');
  let md = '# Appium server arguments\n\n';
  md += 'Many Appium 1.5 server arguments have been deprecated in favor of the ';
  md += '[--default-capabilities flag](/docs/en/writing-running-appium/default-capabilities-arg.md).';
  md += '\n\nUsage: `node . [flags]`\n\n';
  md += '## Server flags\n';
  md += 'All flags are optional, but some are required in conjunction with ' +
        'certain others.\n\n';
  md += '\n\n<expand_table>\n\n';
  md += '|Flag|Default|Description|Example|\n';
  md += '|----|-------|-----------|-------|\n';
  appiumArguments.forEach(function handleArguments (arg) {
    const argNames = arg[0];
    const exampleArg = typeof arg[0][1] === 'undefined' ? arg[0][0] : arg[0][1];
    const argOpts = arg[1];

    // --keystore-path default contains a user-specific path,
    // let's replace it with <user>/...
    if (arg[0][0] === '--keystore-path') {
      const userPath = process.env.HOME || process.env.USERPROFILE;
      argOpts.default = argOpts.default.replace(userPath, '&lt;user&gt;');
    }

    // handle empty objects
    if (JSON.stringify(argOpts.default) === '{}') {
      argOpts.default = '{}';
    }

    md += '|`' + argNames.join('`, `') + '`';
    md += '|' + ((typeof argOpts.default === 'undefined') ? '' : argOpts.default);
    md += '|' + argOpts.help;
    md += '|' + ((typeof argOpts.example === 'undefined') ? '' : '`' + exampleArg + ' ' + argOpts.example + '`');
    md += '|\n';
  });

  fs.writeFile(docFile, md, function finishDocs (err) {
    if (err) {
      log(err.stack);
    } else {
      log('New docs written! Do not forget to commit and push');
    }
  });
});
