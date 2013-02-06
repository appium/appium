"use strict";

 /**
 *	Copyright 2012 Appium Committers
 *
 *	Licensed to the Apache Software Foundation (ASF) under one
 *	or more contributor license agreements.  See the NOTICE file
 *	distributed with this work for additional information
 *	regarding copyright ownership.  The ASF licenses this file
 *	to you under the Apache License, Version 2.0 (the
 *	"License"); you may not use this file except in compliance
 *	with the License.  You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 *	Unless required by applicable law or agreed to in writing,
 *	software distributed under the License is distributed on an
 *	"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *	KIND, either express or implied.  See the License for the
 *	specific language governing permissions and limitations
 *	under the License.
 */

#import "../lib/mechanic.js"
#import "../lib/status.js"
#import "utility.js"
#import "element.js"
#import "app.js"
#import "binding.js"

// Keyboard

var sendKeysToActiveElement = function(keys) {
    if (hasSpecialKeys(keys)) {
        return sendKeysToActiveElementSpecial(keys);
    } else {
        var keyboard = UIATarget.localTarget().frontMostApp().keyboard();
        keyboard.typeString(keys);
    }
    return {
      status: codes.Success.code,
      value: null
    };
};

var hasSpecialKeys = function(keys) {
    var numChars = keys.length;
    for ( var i = 0; i < numChars; i++)
        if (isSpecialKey(keys.charAt(i)))
            return true;
    return false;
};

var sendKeysToActiveElementSpecial = function(keys) {
    var keyboard = UIATarget.localTarget().frontMostApp().keyboard();
    var numChars = keys.length;
    for ( var i = 0; i < numChars; i++)
        typeKey(keyboard, keys.charAt(i));
    return {
      status: codes.Success.code,
      value: null
    };
};

// handles some of the special keys in org.openqa.selenium.Keys

var isSpecialKey = function(k) {
    if (k === '\uE003') // DELETE
        return true;
    else if (k === '\uE006' || k === '\uE007') // RETURN ENTER
        return true;
    return false;
};

var typeKey = function(keyboard, k) {
    if (k === '\uE003') { // DELETE
      keyboard.keys()["Delete"].tap();
    } else if (k === '\uE006' || k === '\uE007') {// RETURN ENTER
      keyboard.buttons()["Go"].tap();
    } else {
      keyboard.typeString(String(k)); // regular key
    }
};

// does a flick in the middle of the screen of size 1/4 of screen
// using the direction corresponding to xSpeed/ySpeed
var touchFlickFromSpeed = function(xSpeed, ySpeed) {
    // get x, y of vector that provides the direction given by xSpeed/ySpeed and
    // has length .25
    var mult = Math.sqrt((0.25 * 0.25) / (xSpeed * xSpeed + ySpeed * ySpeed));
    var x = mult * xSpeed;
    var y = mult * ySpeed;

    // translate to flick in the middle of the screen
    var options = {
        startOffset : {
            x : 0.5 - .5 * x,
            y : 0.5 - .5 * y
        },
        endOffset : {
            x : 0.5 + .5 * x,
            y : 0.5 + .5 * y
        }
    };

    var mainWindow = UIATarget.localTarget().frontMostApp().mainWindow();
    mainWindow.flickInsideWithOptions(options);
    return {
      status: codes.Success.code,
      value: null
    };
};

// similar to flick but does a longer movement in the direction of the swipe
// does a swipe in the middle of the screen of size 1/2 of screen
// using the direction corresponding to xSpeed/ySpeed
var touchSwipeFromSpeed = function(xSpeed, ySpeed) {
    // get x, y of vector that provides the direction given by xSpeed/ySpeed and
    // has length .50
    var mult = Math.sqrt((0.5 * 0.5) / (xSpeed * xSpeed + ySpeed * ySpeed));
    var x = mult * xSpeed;
    var y = mult * ySpeed;

    // translate to swipe in the middle of the screen
    var options = {
        startOffset : {
            x : 0.5 - .25 * x,
            y : 0.5 - .25 * y
        },
        endOffset : {
            x : 0.5 + .75 * x,
            y : 0.5 + .75 * y
        },
        duration : 0.2
    };

    var mainWindow = UIATarget.localTarget().frontMostApp().mainWindow();
    mainWindow.dragInsideWithOptions(options);
    return {
      status: codes.Success.code,
      value: null
    };
};

// alerts

var getAlertText = function() {
  return {
    status: codes.Success.code,
    value: target.frontMostApp().alert().name()
  };
};

var acceptAlert = function() {
  target.frontMostApp().alert().defaultButton().tap()
  return {
    status: codes.Success.code,
    value: null
  };
};

var dismissAlert = function() {
  target.frontMostApp().alert().cancelButton().tap()
  return {
    status: codes.Success.code,
    value: null
  };
};
