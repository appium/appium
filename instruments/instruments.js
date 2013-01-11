// Wrapper around Apple's Instruments app
//

var spawn = require('child_process').spawn;

var Instruments = function(server, app, udid, bootstrap, template) {
    this.server = server;
    this.app = app;
    this.udid = udid;
    this.bootstrap = bootstrap;
    this.template = template;
    this.commandStack = [];
    this.resultHandler = this.defaultResultHandler;
    this.extendServer();
};

Instruments.prototype.launch = function(err, cb) {
    var args = ["-t", template], proc;
    if (this.udid) {
        args.concat(["-w", this.udid]);
    }
    args.concat(["-e", "UIASCRIPT", this.bootstrap]);
    proc = spawn("/usr/bin/instruments", args);
    proc.stdout.on('data', this.outputStreamHandler);
    proc.stderr.on('data', this.errorStreamHandler);
    proc.stderr.on('exit', function(code) {
        console.log("Instruments exited with code " + code);
    });
};

Instruments.prototype.pushCommand = function(cmd) {
    this.commandStack.push(cmd);
};

Instruments.prototype.popCommand = function(cmd) {
    return this.commandStack.shift(cmd);
};

Instruments.prototype.extendServer = function(err, cb) {
    var self = this;
    this.server.get('/instruments/next_command', this.getNextCommand);
};

Instruments.prototype.getNextCommand = function(req, res) {
    // add timing logic etc...
    // if ( should rate limit ) {
    //   res.send(404, "Not Found");
    // } else {
    if (this.commandStack.length) {
        res.send(this.popCommand());
    } else {
        res.send(404, "Not Found");
    }
    // }
};

Instruments.prototype.setResultHandler = function(handler) {
    this.resultHandler = handler;
};

Instruments.prototype.defaultResultHandler = function(output) {
    console.log("Got output from instruments: " + output);
};

Instruments.prototype.outputStreamHandler = function(output) {
    // do any kind of output nice-ification
    var result = output;
    // if we're ready to send output back....
    this.resultHandler(result);
};

Instruments.prototype.errorStreamHandler = function(output) {
    console.log("Stderr: " + output);
};

module.exports = function(server, app, udid, bootstrap, template) {
    return new Instruments(server, app, udid, bootstrap, template);
};
