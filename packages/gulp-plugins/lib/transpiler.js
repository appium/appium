'use strict';

const babel = require('gulp-babel');
const rename = require('gulp-rename');
const streamCombiner = require('./stream-combiner');
const path = require('path');
const sourcemaps = require('./sourcemaps');

const BABEL_OPTS = {
  configFile: path.resolve(__dirname, '..', '.babelrc'),
};

const renameEsX = function () {
  return rename(function renameEs(path) {
    path.basename = path.basename.replace(/\.es[67]$/, '');
  });
};

module.exports = function transpiler(opts = {}) {
  const {sourceMapInit, sourceMapHeader, sourceMapWrite} = sourcemaps(opts.sourceMapOpts);

  this.stream = function stream() {
    return streamCombiner(function combine(source) {
      return source
        .pipe(sourceMapInit)
        .pipe(babel(Object.assign({}, BABEL_OPTS, opts.babelOpts)))
        .pipe(sourceMapHeader)
        .pipe(renameEsX())
        .pipe(sourceMapWrite);
    });
  };
};
