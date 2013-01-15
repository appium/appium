var net = require('net')
  , ap = require('argparse').ArgumentParser;

var main = function() {
  var parser = new ap({
    version: '0.0.1',
  });
  parser.addArgument(['-r', '--result'], {defaultValue: null, required: false});
  parser.addArgument(['-s', '--socket'], {defaultValue: '/tmp/instruments_sock', required: false});
  var args = parser.parseArgs();
  var client = net.connect({path: args.socket}, function() {
    var data = {event: "cmd"};
    if (args.result) {
      data.result = JSON.parse(args.result);
    }
    data = JSON.stringify(data);
    client.write(data);
  });
  client.on('data', function(data) {
    data = JSON.parse(data);
    process.stdout.write(data.nextCommand);
    client.end();
    process.exit(0);
  });
};

if (module === require.main) {
  main();
}
