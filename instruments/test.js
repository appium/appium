var http = require('http')
  , url = require('url')
  , express = require('express')
  , app = express()
  , path = require('path')
  , server = http.createServer(app)
  , ap = require('argparse').ArgumentParser
  , colors = require('colors')
  , instruments = require('./instruments');

app.configure(function() {
  app.use(app.router);
});


