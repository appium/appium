"use strict";
var chai = require('chai')
  , should = chai.should()
  , serverUrl = 'http://localhost:4723'
  , serverHub = serverUrl + '/wd/hub/session'
  , request = require('request');

describe("common - jsonwp @skip-ci @skip-ios6", function () {
  // TODO: This cannot be tested using Sauce. It need to be run within a Travis
  // instance.
  describe('to a non-existent url', function () {
    it('should get 404 with text/plain body', function (done) {
      request.get(serverUrl + '/a/bad/path', function (err, res, body) {
        should.not.exist(err);
        res.headers['content-type'].should.equal('text/plain; charset=utf-8');
        res.statusCode.should.equal(404);
        body.should.be.ok;
        done();
      });
    });
  });
  describe('to get list of sessions', function () {
    it('should return empty list if no session active', function (done) {
      request.get(serverHub + 's', function (err, res, body) {
        should.not.exist(err);
        JSON.parse(body).value.should.deep.equal([]);
        done();
      });
    });
  });
  describe('to a not-yet-implemented url', function () {
    it('should respond with 501 Not Implemented', function (done) {
      var url = serverHub + '/fakesessid/local_storage';
      request.post(url, function (err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(501);
        JSON.parse(body).status.should.equal(13);
        done();
      });
    });
  });
  describe('to a variable resource that doesnt exist', function () {
    it('should respond with a 404', function (done) {
      var url = serverHub + '/fakesessid';
      request.get(url, function (err, res) {
        should.not.exist(err);
        res.statusCode.should.equal(404);
        done();
      });
    });
  });
  describe('that generates a server error', function () {
    it('should respond with a 500', function (done) {
      var url = serverUrl + '/wd/hub/produce_error';
      request.post(url, function (err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(500);
        body.should.be.ok;
        body = JSON.parse(body);
        body.value.should.be.ok;
        done();
      });
    });
  });
  describe('that generates a server crash', function () {
    it('should respond with a 500', function (done) {
      var url = serverUrl + '/wd/hub/crash';
      request.post(url, function (err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(500);
        body.should.be.ok;
        body = JSON.parse(body);
        body.value.should.be.ok;
        done();
      });
    });
  });
});

