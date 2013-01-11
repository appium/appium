var http = require('http')
  , url = require('url')
  , express = require('express')
  , app = express()
  , path = require('path')
  , server = http.createServer(app)
  , ap = require('argparse').ArgumentParser
  , colors = require('colors')
  , routing = require('./app/routing')
  , appium = require('./app/appium');

session = {
  sessionId: null
  , client: null
};

app.configure(function() {
  app.use(express.favicon());
  app.use(express.static(path.join(__dirname, '/app/static')));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

// Import the routing rules
routing(app);

// Setup all the command line argument parsing
var parser = new ap({
  version: '0.0.1',
  addHelp: true,
  description: 'A webdriver-compatible server for use with native and hybrid iOS applications.'
});

parser.addArgument([ '--app' ]
  , { required: true, help: 'path to simulators .app file or the bundle_id of the desired target on device'
});

parser.addArgument([ '-V', '--verbose' ], { required: false, help: 'verbose mode' });
parser.addArgument([ '-U', '--UDID' ]
  , { required: true, help: 'unique device identifier of the SUT'
});

parser.addArgument([ '-a', '--address' ]
  , { defaultValue: '127.0.0.1'
  , required: false
  , help: 'ip address to listen on'
});

parser.addArgument([ '-p', '--port' ]
  , { defaultValue: 4723, required: false, help: 'port to listen on'
});

// Make sure we have all the args
var args = parser.parseArgs();

// Instantiate the appium client
session.client = appium(args.app, args.UDID, args.verbose);

// Start the web server that receives all the commands
server.listen(args.port, args.address, function() {
  session.sessionId = new Date().getTime();
  var logMessage = "Appium started on "+args.address+":"+args.port;
  console.log(logMessage.cyan);
});
