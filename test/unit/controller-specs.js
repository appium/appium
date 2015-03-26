var sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , chai = require('chai')
  , controller = require('../../lib/server/controller.js');

chai.use(sinonChai);
chai.should();

describe('deleteSession', function () {
  "use strict";
  describe('sessionRemain', function () {
    var req = {
      appium : {
        stop : sinon.spy()
      }
    };
    var res = {
      status : function () {
        return {
          send : function () {
          }
        };
      }
    };

    it('should respond 200 OK when set', function () {
      sinon.spy(res, 'status');
      req.appium.sessionRemain = true;
      controller.deleteSession(req, res);
      res.status.should.have.been.calledWith(200);
    });

    it('should stop the appium session when not set', function () {
      req.appium.sessionRemain = false;
      controller.deleteSession(req, res);
      req.appium.stop.should.have.been.called;
    });
  });
});
