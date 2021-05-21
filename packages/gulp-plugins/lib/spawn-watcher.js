'use strict';

const log = require('fancy-log');
const red = require('ansi-red');
const notifier = require('node-notifier');
const moment = require('moment');


const COLOR_CODE_REGEXP = /\u001b\[(\d+(;\d+)*)?m/g; // eslint-disable-line no-control-regex

module.exports = {
  use (gulp, opts = {}) {
    this.gulp = gulp;
    this.title = opts.build || 'Appium';

    this.exitOnError = true;
    this.errored = false;

    return this;
  },

  notify (subtitle, message) {
    if (process.argv.includes('--no-notif')) {
      return;
    }

    try {
      notifier.notify({
        title: this.title,
        subtitle: `${subtitle} ${moment().format('h:mm:ss')}`,
        message,
      });
    } catch (ign) {
      log(`Notifier: [${this.title}] ${message}`);
    }
  },

  notifyOK () {
    this.notify('Build success!', 'All Good!');
  },

  handleError (err) {
    this.errored = true;

    // log the error
    const strErr = `${err}`;
    for (const line of strErr.split('\n')) {
      log.error(red(line));
    }

    // use the system notifier
    const notifyErr = strErr.replace(COLOR_CODE_REGEXP, '');
    this.notify('Build failure!', notifyErr);
    if (this.exitOnError) {
      process.exit(1);
    }
  },

  configure (taskName, filePattern, sequence) {
    const notifyWatch = (done) => {
      if (!this.errored) {
        this.notifyOK();
      }
      this.errored = false;
      done();
    };
    this.gulp.task(taskName, () => {
      this.exitOnError = false;

      // there is nothing we can do if the gulpfile has been changed
      this.gulp.watch('./gulpfile.js', function watchGulpfile () {
        log('Gulpfile has been changed. Exiting');
        process.exit(1);
      });

      return this.gulp.watch(filePattern, {ignoreInitial: false}, this.gulp.series(sequence, notifyWatch));
    });
  }
};
