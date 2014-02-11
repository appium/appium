"use strict";

// todo: this was converted to promise chain api, but not tested.
var setup = require("../common/setup-base");

describe("firefoxos - contacts -", function () {
  var driver;
  setup(this, {app: 'Contacts'}).then(function (d) { driver = d; });
 
  it('should load app', function (done) {
    var firstName = "Name";
    var lastName = Date.now().toString();
    driver
      .url().should.become("app://communications.gaiamobile.org/contacts/index.html")
      .elementById('add-contact-button').click()
      .elementById('givenName').sendKeys(firstName)
      .elementById('familyName').sendKeys(lastName)
      .elementById('save-button').click()
      .sleep(1000)
      .elementByTagName('body').text()
        .should.eventually.include(firstName + " " + lastName)
      .nodeify(done);
  });
});
