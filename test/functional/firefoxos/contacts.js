"use strict";

var describeWd = require('../../helpers/driverblock.js').describeForApp('Contacts', 'firefox')
  , it = require("../../helpers/driverblock.js").it
  , should = require("should");

describeWd('firefoxos', function(h) {
  return it('should load app', function(done) {
    var firstName = "Name";
    var lastName = Date.now().toString();
    h.driver.url(function(err, url) {
      should.not.exist(err);
      url.should.eql("app://communications.gaiamobile.org/contacts/index.html");
      h.driver.elementById('add-contact-button', function(err, el) {
        should.not.exist(err);
        el.click(function(err) {
          should.not.exist(err);
          h.driver.elementById('givenName', function(err, name1) {
            should.not.exist(err);
            name1.sendKeys(firstName);
            h.driver.elementById('familyName', function(err, name2) {
              should.not.exist(err);
              name2.sendKeys(lastName);
              h.driver.elementById('save-button', function(err, save) {
                should.not.exist(err);
                save.click(function(err) {
                  should.not.exist(err);
                  h.driver.elementByTagName('body', function(err, body) {
                    setTimeout(function() {
                      body.text(function(err, text) {
                        should.not.exist(err);
                        text.should.include(firstName + " " + lastName);
                        done();
                      });
                    }, 1000);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
