/* eslint no-console:0 */
'use strict';

// turn all logging on since we have tests that rely on npmlog logs actually
// getting sent to the handler
process.env._FORCE_LOGS = '1';

const gulp = require('gulp');
const boilerplate = require('appium-gulp-plugins').boilerplate.use(gulp);

// remove 'fsevents' from shrinkwrap, since it causes errors on non-Mac hosts
// see https://github.com/npm/npm/issues/2679

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
  testTimeout: 160000,
  preCommitTasks: ['eslint', 'once'],
});

// ToDo(Christian): move this into the scripts
// generates server arguments readme
// gulp.task('docs', gulp.series(['transpile']), function parseDocs () {
//   const parser = require('./build/lib/parser.js');
//   const appiumArguments = parser.getParser().rawArgs;
//   const docFile = path.resolve(__dirname, 'docs/en/writing-running-appium/server-args.md');
//   let md = '# Appium server arguments\n\n';
//   md += 'Many Appium 1.5 server arguments have been deprecated in favor of the ';
//   md += '[--default-capabilities flag](/docs/en/writing-running-appium/default-capabilities-arg.md).';
//   md += '\n\nUsage: `node . [flags]`\n\n';
//   md += '## Server flags\n';
//   md += 'All flags are optional, but some are required in conjunction with ' +
//         'certain others.\n\n';
//   md += '\n\n<expand_table>\n\n';
//   md += '|Flag|Default|Description|Example|\n';
//   md += '|----|-------|-----------|-------|\n';
//   appiumArguments.forEach(function handleArguments (arg) {
//     const argNames = arg[0];
//     const exampleArg = typeof arg[0][1] === 'undefined' ? arg[0][0] : arg[0][1];
//     const argOpts = arg[1];

//     // --keystore-path defaultValue contains a user-specific path,
//     // let's replace it with <user>/...
//     if (arg[0][0] === '--keystore-path') {
//       const userPath = process.env.HOME || process.env.USERPROFILE;
//       argOpts.defaultValue = argOpts.defaultValue.replace(userPath, '&lt;user&gt;');
//     }

//     // handle empty objects
//     if (JSON.stringify(argOpts.defaultValue) === '{}') {
//       argOpts.defaultValue = '{}';
//     }

//     md += '|`' + argNames.join('`, `') + '`';
//     md += '|' + ((typeof argOpts.defaultValue === 'undefined') ? '' : argOpts.defaultValue);
//     md += '|' + argOpts.help;
//     md += '|' + ((typeof argOpts.example === 'undefined') ? '' : '`' + exampleArg + ' ' + argOpts.example + '`');
//     md += '|\n';
//   });

//   fs.writeFile(docFile, md, function finishDocs (err) {
//     if (err) {
//       log(err.stack);
//     } else {
//       log('New docs written! Do not forget to commit and push');
//     }
//   });
// });
