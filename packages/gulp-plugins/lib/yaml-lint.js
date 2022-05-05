/* eslint-disable promise/prefer-await-to-callbacks */
const {Transform} = require('stream');
const log = require('fancy-log');
const yaml = require('js-yaml');
const {EOL} = require('os');
const PluginError = require('plugin-error');
const red = require('ansi-red');

function gulpYamlLint() {
  let errCount = 0;
  return new Transform({
    objectMode: true,
    transform(file, enc, cb) {
      try {
        yaml.load(file.contents.toString(enc));
      } catch (err) {
        errCount++;
        log.error(`Invalid YAML file: '${file.path}'`);
        for (const line of err.message.split(EOL)) {
          log.error(line);
        }
      }
      cb();
    },
    flush(done) {
      if (errCount > 0) {
        log.error(
          `YAML errors found. Due to the limitations of YAML linting, the error `
        );
        log.error(
          `is most likely in the line immediately ${red(
            'before'
          )} the line reported.`
        );
        return done(
          new PluginError('gulp-yaml-lint', {
            name: 'YAMLError',
            message: `Failed with ${errCount} ${
              errCount === 1 ? 'error' : 'errors'
            }`,
          })
        );
      }
      done();
    },
  });
}

module.exports = gulpYamlLint;
