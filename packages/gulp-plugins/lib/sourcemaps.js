'use strict';

const path = require('path');
const sourcemaps = require('gulp-sourcemaps');
const replace = require('gulp-replace');
const { EOL } = require('os');


const SOURCEMAP_OPTS = {
  sourceRoot (file) {
    // Point to source root relative to the transpiled file
    return path.relative(path.join(file.cwd, file.path), file.base);
  },
  includeContent: true,
};

const HEADER = `require('source-map-support').install();${EOL + EOL}`;


module.exports = function getSourceMapFns (opts = {}) {
  const sourceMapOpts = Object.assign({}, SOURCEMAP_OPTS, opts);

  return {
    sourceMapInit: sourcemaps.init(),
    sourceMapHeader: replace(/$/, HEADER),
    sourceMapWrite: sourcemaps.write(sourceMapOpts),
  };
};
