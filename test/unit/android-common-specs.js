'use strict';

var rewire = require('rewire')
  , androidCommon = rewire('../../lib/devices/android/android-common.js')
  , chai = require('chai');

chai.should();

var javaVersionStdErr = 'Picked up _JAVA_OPTIONS: -Djava.awt.headless=true\njava version "1.8.0_22"';

var fakeExec = function (_, fn) {
  fn(null, null, javaVersionStdErr);
};

var _testDouble = function () {
  var _version = 'Version not set';
  return {
    callback : function (_, version) {
      _version = version;
    },
    value : function () {
      return _version;
    }
  };
};

androidCommon.__set__("exec", fakeExec);

describe('devices/android/android-common.js', function () {
  describe('java version parsing', function () {

    it('parses single line output', function () {
      androidCommon.parseJavaVersion('java version 1.8').should.be.equal('1.8');
    });

    it('parses multiple line output', function () {
      androidCommon.parseJavaVersion(javaVersionStdErr).should.be.equal('1.8.0_22');
    });

    it('passes version to callback', function () {
      var testDouble = _testDouble();
      androidCommon.getJavaVersion(testDouble.callback);
      testDouble.value().should.be.equal('1.8.0_22');
    });

  });
});
