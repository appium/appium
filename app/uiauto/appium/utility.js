/*global au:true $:true UIATarget:true */
"use strict";
var au;

if (typeof au === "undefined") {
  au = {};
}

$.extend(au, {
  // Obtaining Device Property Information like Name, OS ver, Model etc
  getDeviceDetail: function() {
    return {
      deviceName: UIATarget.localTarget().name()
      , deviceModel: UIATarget.localTarget().model()
      , systemName: UIATarget.localTarget().systemName()
      , systemVersion: UIATarget.localTarget().systemVersion()
    };
  }
});
