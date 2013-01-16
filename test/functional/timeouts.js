/*global describe:true, it:true */
"use strict";

/*
 * Turns out python's implicit wait doesn't respect the functionality described
 * by WebDriver. Implemented it anyways for parity, will fix later and enable
 * this test
 */

// var wd = require('wd')
//   , assert = require('assert')
//   , caps = {
//       browserName: 'iOS'
//       , platform: 'Mac'
//       , version: '6.0'
//     };
// 
// describe('check implicit wait', function() {
//   var driver = wd.remote('127.0.0.1', 4723);
//   return it('should set the implicit wait for finding elements', function(done) {
//     driver.init(caps, function(err, sessionId) {
//       driver.setImplicitWaitTimeout(10 * 1000, function(err) {
//         var before = new Date().getTime() / 1000;
//         console.log(before);
//         driver.elementsByTagName('notgonnabethere', function(err, missing) {
//           var after = new Date().getTime() / 1000;
//           console.log(after);
//           assert.ok(after - before < 12);
//           assert.ok(after - before > 10);
//           driver.quit(function() {
//             done();
//           });
//         });
//       });
//     });
//   });
// });
