'use strict';


const configure = function configure (gulp, opts) {
  gulp.task('prepublish', gulp.series('clean', 'transpile', opts.extraPrepublishTasks || []));
};

module.exports = {
  configure,
};
