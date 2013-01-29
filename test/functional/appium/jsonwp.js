/*global it:true, describe:true*/
"use strict";

var should = require("should")
  , serverUrl = 'http://localhost:4723'
  , request = require('request');

describe('http request', function() {
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
});
