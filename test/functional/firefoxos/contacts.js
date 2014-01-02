"use strict";

// todo: this was converted to promise chain api, but not tested.
var describeWd = require('../../helpers/driverblock.js').describeForApp('Contacts', 'firefox')
  , it = require("../../helpers/driverblock.js").it;

describeWd('firefoxos', function(h) {
  return it('should load app', function(done) {
    var firstName = "Name";
    var lastName = Date.now().toString();
    h.driver
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
