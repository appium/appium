"use strict";

exports.filterVisible = function (selector) {
  return selector.replace(/;$/, '.withPredicate("isVisible == 1");');
  // return selector.replace(/;$/, '.withValueForKey(1, "isVisible");');
};

