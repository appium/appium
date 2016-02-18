"use strict";

var chai = require('chai')
  , controller_path = '../../lib/devices/android/android-controller.js'
  , controller = require(controller_path)
  , _ = require('underscore')
  , sinon = require('sinon');

chai.should();

describe('android-controller', function () {
  describe('#parseTouch', function () {
    describe('given a touch sequence with absolute coordinates', function () {
      it('should use offsets for moveTo', function (done) {
        var actions = [ { action: 'press', options: { x: 100, y: 101 } },
                        { action: 'moveTo', options: { x: 50, y: 51 } },
                        { action: 'wait', options: { ms: 5000 } },
                        { action: 'moveTo', options: { x: -40, y: -41 } },
                        { action: 'release', options: {} } ];
        controller.parseTouch(actions, false, function (err, touchStates) {
          touchStates.length.should.equal(5);

          var actions = [{action: 'press', x: 100, y: 101},
                         {action: 'moveTo', x: 150, y: 152},
                         {action: 'wait', x: 150, y: 152},
                         {action: 'moveTo', x: 110, y: 111},
                         {action: 'release'}];
          _.each(touchStates, function (state, index) {
            state.action.should.equal(actions[index].action);
            if (actions[index].action !== 'release') {
              state.options.x.should.equal(actions[index].x);
              state.options.y.should.equal(actions[index].y);
            }
          });

          done();
        });
      });
    });
  });

  describe('#performTouch', function() {
      describe('longPress, moveTo, release - converted to drag', function(done) {
        var actions = [ { action: 'longPress', options: { x: 100, y: 101 } },
          { action: 'moveTo', options: { x: 50, y: 51 } },
          { action: 'release', options: {} } ];

        beforeEach(function() {
          sinon.stub(controller, 'drag', function(startX, startY, endX, endY, duration, touchCount, elementId, destElId, cb) {
            cb();
          });

          controller.adb = {
            getApiLevel: sinon.stub().callsArgWith(0, null, 4)
          }
        });

        afterEach(function() {
          controller.drag.restore();
        });

        it('longPress does not have duration', function(done) {
          controller.performTouch(actions, function() {
            sinon.assert.calledWith(controller.drag, 100, 101, 50, 51, 1, 1, undefined, undefined);
            done();
          });
        });

        it('longPress does have a duration', function(done) {
          actions[0].options.duration = 7000;

          controller.performTouch(actions, function() {
            sinon.assert.calledWith(controller.drag, 100, 101, 50, 51, 7, 1, undefined, undefined);
            done();
          });
        });

        it('longPress duration less than 1 second', function(done) {
          actions[0].options.duration = 700;
          controller.adb.getApiLevel.callsArgWith(0, null, 6);

          controller.performTouch(actions, function() {
            sinon.assert.calledWith(controller.drag, 100, 101, 50, 51, 2, 1, undefined, undefined);
            done();
          });
        });
      });
  });
});
