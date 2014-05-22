"use strict";

var setup = require("../common/setup-base"),
  desired = require('./desired');

describe('selendroid - network-connection -', function () {

  describe('toggle flight mode', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });
    it('should toggle the airplane mode', function (done) {
      // first get the current mode:
      driver._jsonWireCall({
        method: 'GET'
        , relPath: '/network_connection'
        , cb: function (err, type) {
            (err === null).should.be.true;
            var newType = JSON.parse(type).value % 2 + 1;
            // now set the network connection type
            driver._jsonWireCall({
              method: 'POST'
              , relPath: '/network_connection'
              , data: { "parameters": {"type": newType} }
              , cb: function (err2, type2) {
                (err2 === null).should.be.true;
                (JSON.parse(type2).value % 2).should.equal(newType % 2);
                // and really make sure it was set correctly
                driver._jsonWireCall({
                  method: 'GET'
                  , relPath: '/network_connection'
                  , cb: function (err3, type3) {
                    (err3 === null).should.be.true;
                    (JSON.parse(type3).value % 2).should.equal(newType % 2);
                    done();
                  }
                });
              }
            });
          }
        });
    });
  });
});
