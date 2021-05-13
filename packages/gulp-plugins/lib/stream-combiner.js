'use strict';

const through = require('through2');
const EE = require('events').EventEmitter;


module.exports = function combine (pipeFn) {
  const inStream = through.obj();
  const outStream = pipeFn(inStream);
  const combinedStream = new EE(); // not a real stream, just pretending
  combinedStream.on('pipe', function onPipe (source) {
    source.unpipe(this);
    source.pipe(inStream);
  });
  combinedStream.pipe = function pipeFn (dest, options) {
    return outStream.pipe(dest, options);
  };
  return combinedStream;
};
