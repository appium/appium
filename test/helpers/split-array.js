"use strict";

var _ = require('underscore'),
    assert = require('assert');

function computeArrayRepartition(numOfItems, numOfGroups) {
  var output = [];

  // pessimistic estimate of group size
  var numOfItemsInGroup = Math.floor(numOfItems/numOfGroups);
  console.log('numOfItemsInGroup ->', numOfItemsInGroup);

  // rough repartition, this generates too many groups
  _(numOfItems).times(function (i) {
    var groupId = Math.ceil((i+1)/numOfItemsInGroup) -1;
    if (!output[groupId]) output.push(0);
    output[groupId]++;
  });
 // spread elements from extra groups
 var currentValidGroup = 0;
  _(output).chain().filter(function (__, i) {
    return i >= numOfGroups;
  }).each(function (numOfElsInGroup) {
    _(numOfElsInGroup).times(function () {
      output[currentValidGroup] ++;
      currentValidGroup = (currentValidGroup + 1) % numOfGroups;
    });
  });
  output = _(output).filter(function (group, i) { return i < numOfGroups; });

  // double checking
  assert(output.length === numOfGroups);
  assert( _(output).reduce(function (total, numOfElsInGroup) { return total + numOfElsInGroup; }, 0) === numOfItems);

  return output;
}

function splitArray(src , numOfGroups) {
  var currentIdx =0;
  var repartition = computeArrayRepartition(src.length, numOfGroups);

  // splitting elements according to repartition
  return _(repartition).map(function (numOfItems) {
    var itemGroup = [];
    _(numOfItems).times(function () {
      itemGroup.push(src[currentIdx]);
      currentIdx ++;
    });
    return itemGroup;
  });
}

module.exports = splitArray;
