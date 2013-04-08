/*global it:true, describe:true, beforeEach:true, afterEach:true */
"use strict";

var should = require("should")
  , serverUrl = 'http://localhost:4723'
  , serverHub = serverUrl + '/wd/hub/session'
  , path = require('path')
  , appPath = "../../../sample-code/apps/TestApp/build/Release-iphonesimulator/TestApp.app"
  , request = require('request');

var describeWithSession = function(desc, tests) {
  describe(desc, function() {
    var sessObj = {sessionId: null};
    beforeEach(function(done) {
      var caps = {desiredCapabilities: {
        app: path.resolve(__dirname, appPath)
      }};
      request.post({url: serverHub, json: caps}, function(err, res) {
        should.not.exist(err);
        res.statusCode.should.equal(303);
        should.ok(res.headers.location);
        request.get(res.headers.location, function(err, res, body) {
          should.not.exist(err);
          res.statusCode.should.equal(200);
          body = JSON.parse(body);
          sessObj.sessionId = body.sessionId;
          done();
        });
      });
    });

    afterEach(function(done) {
      var url = serverHub + '/' + sessObj.sessionId;
      request.del(url, function(err, res) {
        should.not.exist(err);
        [404, 200].should.include(res.statusCode);
        sessObj.sessionId = null;
        done();
      });
    });

    tests(sessObj);
  });
};
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
  describe('to get list of sessions', function() {
    it('should return empty list if no session active', function(done) {
      request.get(serverHub + 's', function(err, res, body) {
        should.not.exist(err);
        JSON.parse(body).value.should.eql([]);
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
        JSON.parse(body).status.should.equal(13);
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
  describeWithSession('that generates a server error', function() {
    it('should respond with a 500', function(done) {
      var url = serverUrl + '/wd/hub/produce_error';
      request.post(url, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(500);
        should.ok(body);
        body = JSON.parse(body);
        should.ok(body.value);
        done();
      });
    });
  });
  describeWithSession('that generates a server crash', function() {
    it('should respond with a 500', function(done) {
      var url = serverUrl + '/wd/hub/crash';
      request.post(url, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(500);
        should.ok(body);
        body = JSON.parse(body);
        should.ok(body.value);
        done();
      });
    });
  });
});

