"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require("./desired")
  , reset = require("./reset");

describe("apidemo - notifications", function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function () {
      return reset(driver);
    });
  }

  it('should open the notification shade', function (done) {
    driver
      // get to the notification page
      .elementByName("App").click()
      .elementByName("Notification").click()
      .elementByName("Status Bar").click()
      // create a notification
      .elementByName(":-|").click()
      .openNotifications()
      .sleep(500)
      // shouldn't see the elements behind shade
      .elementByName(":-|").should.be.rejectedWith(/status: 7/)
      // should see the notification
      .elementsByClassName('android.widget.TextView').then(function (els) {
        return els[2].text();
      })
      .should.eventually.become('Mood ring')
      // return to app
      .deviceKeyEvent(4)
      // should be able to see elements from app
      .elementByName(":-|").text().should.become(":-|")
      .nodeify(done);
  });
});
