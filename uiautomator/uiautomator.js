"use strict";

var net = require('net');

var connect = function() {
  var client = net.connect(4724, function() {
    var data = {event: "helo"};
    data = JSON.stringify(data);
    data += "\n";
    client.write(data, "utf8");
  });
  client.setEncoding('utf8');
  client.on('data', function(data) {
    data = JSON.parse(data);
    console.log(data);
    client.end();
  });
};

connect();
