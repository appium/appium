"use strict";

var express = require('express'),
    app = express(),
    path = require('path');

app.use(express.static(__dirname + '/static'));

app.get('/index.html', function (req, res) {
  res.sendfile(path.resolve(__dirname, '../assets/index.html'));
});

app.get('/WebViewApp7.1.app.zip', function (req, res) {
  res.sendfile(path.resolve(__dirname, '../../../../assets/WebViewApp7.1.app.zip'));
});

app.get('/ApiDemos-debug.apk', function (req, res) {
  res.sendfile(path.resolve(__dirname, '../../../../assets/ApiDemos-debug.apk'));
});

var server;

exports.start = function () {
    server = app.listen(3000);
};

exports.stop = function () {
    server.close();
};
