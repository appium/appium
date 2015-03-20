"use strict";

var fs = require('fs')
  , Q = require('q')
  , xcode = require('../../lib/devices/ios/xcode.js')
  , chai = require('chai')
  , chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

var fileExists = Q.denodeify(fs.exists);

describe('xcode.js @skip-linux', function () {

  it('should find the automation trace template', function (done) {
    xcode.getAutomationTraceTemplatePath()
    .then(function (traceTemplatePath) {
      fileExists(traceTemplatePath).should.eventually.be.true;
      var suffix = ".tracetemplate";
      traceTemplatePath.slice(-suffix.length).should.equal(suffix);
    })
    .nodeify(done);
  });

});
