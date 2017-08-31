/* eslint no-console:0 */
/* eslint-disable promise/prefer-await-to-callbacks */
"use strict";

// turn all logging on since we have tests that rely on npmlog logs actually
// getting sent to the handler
process.env._FORCE_LOGS="1";

const gulp = require('gulp');
const boilerplate = require('appium-gulp-plugins').boilerplate.use(gulp);
const path = require('path');
const fs = require('fs');

// remove 'fsevents' from shrinkwrap, since it causes errors on non-Mac hosts
// see https://github.com/npm/npm/issues/2679
gulp.task('fixShrinkwrap', function (done) {
  let shrinkwrap;
  try {
    shrinkwrap = require('./npm-shrinkwrap.json');
  } catch (err) {
    console.error('Could not find shrinkwrap; skipping fixing shrinkwrap. ' +
                  '(Original error: ' + err.message + ')');
    return;
  }
  delete shrinkwrap.dependencies.fsevents;
  const shrinkwrapString = JSON.stringify(shrinkwrap, null, '  ') + '\n';
  fs.writeFile('./npm-shrinkwrap.json', shrinkwrapString, done);
});




boilerplate({
  build: 'appium',
  test: {
    files: ['${testDir}/**/*-specs.js']
  },
  extraPrepublishTasks: ['fixShrinkwrap'],
  preCommitTasks: ['eslint', 'once'],
});

// generates server arguments readme
gulp.task('docs', ['transpile'], function () {
  const parser = require('./build/lib/parser.js');
  const appiumArguments = parser.getParser().rawArgs;
  const docFile = path.resolve(__dirname, "docs/en/writing-running-appium/server-args.md");
  let md = "# Appium server arguments\n\n";
  md += "Many Appium 1.5 server arguments have been deprecated in favor of the ";
  md += "[--default-capabilities flag](/docs/en/writing-running-appium/default-capabilities-arg.md).";
  md += "\n\nUsage: `node . [flags]`\n\n";
  md += "## Server flags\n";
  md += "All flags are optional, but some are required in conjunction with " +
        "certain others.\n\n";
  md += "\n\n<expand_table>\n\n";
  md += "|Flag|Default|Description|Example|\n";
  md += "|----|-------|-----------|-------|\n";
  appiumArguments.forEach(function (arg) {
    const argNames = arg[0];
    const exampleArg = typeof arg[0][1] === "undefined" ? arg[0][0] : arg[0][1];
    const argOpts = arg[1];

    // --keystore-path defaultValue contains a user-specific path,
    // let's replace it with <user>/...
    if (arg[0][0] === '--keystore-path') {
      const userPath = process.env.HOME || process.env.USERPROFILE;
      argOpts.defaultValue = argOpts.defaultValue.replace(userPath, '&lt;user&gt;');
    }

    // handle empty objects
    if (JSON.stringify(argOpts.defaultValue) === '{}') {
      argOpts.defaultValue = '{}';
    }

    md += "|`" + argNames.join("`, `") + "`";
    md += "|" + ((typeof argOpts.defaultValue === "undefined") ? "" : argOpts.defaultValue);
    md += "|" + argOpts.help;
    md += "|" + ((typeof argOpts.example === "undefined") ? "" : "`" + exampleArg + " " + argOpts.example + "`");
    md += "|\n";
  });
  // console.log(md);
  fs.writeFile(docFile, md, function (err) {
    if (err) {
      console.log(err.stack);
    } else {
      console.log("New docs written! Don't forget to commit and push");
    }
  });
});
