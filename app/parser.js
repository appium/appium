var ap = require('argparse').ArgumentParser;

// Setup all the command line argument parsing
module.exports = function() {
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
    , { required: false, help: 'unique device identifier of the SUT'
  });

  parser.addArgument([ '-a', '--address' ]
    , { defaultValue: '127.0.0.1'
    , required: false
    , help: 'ip address to listen on'
  });

  parser.addArgument([ '-p', '--port' ]
    , { defaultValue: 4723, required: false, help: 'port to listen on'
  });

  return parser;
};
