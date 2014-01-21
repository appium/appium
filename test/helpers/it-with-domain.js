// TODO do we really need this?
// Commenting for now, I don't think it is needed:
// From mocha doc ---> maps uncaught exceptions to the correct test case

// "use strict";

// var domain = require('domain');

// function wrap(test) {
//   return function(done) {
//     var d = domain.create();
//     d.on('error', function(err) {
//       done(err);
//     });
//     d.run(function() {
//       test(done);
//     });
//   };
// }

// if (GLOBAL.it && !GLOBAL.it.__with_domain){
//   var _it = GLOBAL.it;
//   GLOBAL.it = function(behavior, test) {
//     _it(behavior, wrap(test));
//   };
//   GLOBAL.it.only = function(behavior, test) {
//     _it.only(behavior, wrap(test));
//   };
//   GLOBAL.it.__with_domain = true;
// }


