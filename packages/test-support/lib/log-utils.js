// TODO move that to @appium/support
function stripColors (msg) {
  let code = /\u001b\[(\d+(;\d+)*)?m/g; // eslint-disable-line no-control-regex
  msg = ('' + msg).replace(code, '');
  return msg;
}

class LogStub {
  constructor (opts = {}) {
    this.output = '';
    this.stripColors = opts.stripColors;
  }
  log (level, message) {
    if (this.stripColors) {
      message = stripColors(message);
    }
    if (this.output.length > 0) {
      this.output += '\n';
    }
    this.output = `${this.output}${level}: ${message}`;
  }
}

function stubLog (sandbox, log, opts = {}) {
  let logStub = new LogStub(opts);
  for (let l of log.levels) {
    sandbox.stub(log, l).callsFake(function doLogging (mess) {
      logStub.log(l, mess);
    });
  }
  return logStub;
}

export { stubLog };
