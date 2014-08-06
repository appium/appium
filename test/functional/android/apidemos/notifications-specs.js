"use strict";

var setup = require("../../common/setup-base")
  , desired = require("./desired")
  , _ = require('underscore')
  , Q = require('q');

describe("apidemo - notifications", function () {

  var driver;
  setup(this, _.defaults({
    appActivity: '.app.StatusBarNotifications'
  }, desired)).then(function (d) { driver = d; });

  it('should open the notification shade', function (done) {
    driver
      // create a notification
      .elementByName(":-|").click()
      .openNotifications()
      .sleep(500)
      // should see the notification
      .elementsByClassName('android.widget.TextView').then(function (els) {
        var texts = [];
        _.each(els, function (el) {
          texts.push(el.text());
        });
        return Q.all(texts);
      })
      .should.eventually.include('Mood ring')
      // return to app
      .deviceKeyEvent(4)
      // should be able to see elements from app
      .elementByName(":-|").text().should.become(":-|")
      .nodeify(done);
  });
});
