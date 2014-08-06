"use strict";

var setup = require("../../common/setup-base")
  , env = require('../../../helpers/env')
  ,  desired = require('./desired')
  , _ = require('underscore');

describe('webview - auto', function () {
  var driver;

  setup(this, _.defaults({autoWebview: true}, desired)).then(function (d) { driver = d; });

  it('should go directly into webview', function (done) {
    driver
      .get(env.GUINEA_TEST_END_POINT)
      .elementByLinkText('i am a link').click()
      .elementById('only_on_page_2').should.eventually.exist
      .nodeify(done);
  });
});
