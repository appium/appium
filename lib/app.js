var http = require('http')
  , url = require('url')
  , router = require('router')
  , route = router()
  , colors = require('colors')
  , port = 1337;

route.get('/{base}', function(req, res) {
  res.writeHead(200);
  res.end('hello '+req.params.base);
});

http.createServer(route).listen(port);

var logMessage = "Appium started on localhost:"+port;
console.log(logMessage.cyan);


