// @ts-check
/* eslint no-console:0 */
/* eslint-disable promise/prefer-await-to-callbacks */
'use strict';

// turn all logging on since we have tests that rely on npmlog logs actually
// getting sent to the handler
process.env._FORCE_LOGS = '1';

const gulp = require('gulp');
const boilerplate = require('@appium/gulp-plugins').boilerplate.use(gulp);
const path = require('path');
const fs = require('fs');
const log = require('fancy-log');
const {obj: through} = require('through2');

const APPIUM_CONFIG_SCHEMA_BASENAME = 'appium-config.schema.json';

/**
 * Expects a single file (as defined by `APPIUM_CONFIG_SCHEMA_PATH`) and converts
 * that file to JSON.
 * @param {import('vinyl')} file - Vinyl file object
 * @param {BufferEncoding} enc - Encoding
 * @param {import('through2').TransformCallback} done - Callback
 */
function writeAppiumConfigJsonSchema (file, enc, done) {
  try {
    const {default: schema} = require(file.path);
    // @ts-ignore
    file.contents = Buffer.from(JSON.stringify(schema, null, 2));
    file.basename = APPIUM_CONFIG_SCHEMA_BASENAME;
    done(null, file);
  } catch (err) {
    done(err);
  }
}

// non-JS files that should be copied into the build dir (since babel does not compile them)
gulp.task('copy-files', gulp.parallel(
  function copyTestFixtures () {
    return gulp.src('./test/fixtures/*.{txt,yaml,json}')
      .pipe(gulp.dest('./build/test/fixtures'));
  },
  function copyTestConfigFixtures () {
    return gulp.src('./test/fixtures/config/*.{txt,yaml,json}')
      .pipe(gulp.dest('./build/test/fixtures/config'));
  }
));

gulp.task('generate-appium-schema-json', function () {
  // don't care about file contents as text, so `read: false`
  return gulp.src('./build/lib/schema/appium-config-schema.js', {read: false})
    .pipe(through(writeAppiumConfigJsonSchema))
    .pipe(gulp.dest('./build/lib/'));
});

boilerplate({
  build: 'appium',
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
  testTimeout: 160000,
  postTranspile: ['copy-files', 'generate-appium-schema-json']
});

// generates server arguments readme
gulp.task('docs', gulp.series(['transpile', function parseDocs () {
  // @ts-ignore
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
}]));
