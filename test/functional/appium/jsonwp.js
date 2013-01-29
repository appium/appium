/*global it:true, describe:true*/
"use strict";

var should = require("should")
  , serverUrl = 'http://localhost:4723'
  , serverHub = serverUrl + '/wd/hub/session'
  , request = require('request');

describe('JSONWP request', function() {
  describe('to a non-existent url', function() {
    it('should get 404 with text/plain body', function(done) {
      request.get(serverUrl + '/a/bad/path', function(err, res, body) {
        should.not.exist(err);
        res.headers['content-type'].should.equal('text/plain');
        res.statusCode.should.equal(404);
        should.ok(body);
        done();
      });
    });
  });
  describe('to a not-yet-implemented url', function() {
    it('should respond with 501 Not Implemented', function(done) {
      var url = serverHub + '/fakesessid/ime/deactivate';
      request.post(url, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(501);
        body.should.equal("Not Implemented");
        done();
      });
    });
  });
  describe('to a variable resource that doesnt exist', function() {
    it('should respond with a 404', function(done) {
      var url = serverHub + '/fakesessid';
      request.get(url, function(err, res) {
        should.not.exist(err);
        res.statusCode.should.equal(404);
        done();
      });
    });
  });
});
