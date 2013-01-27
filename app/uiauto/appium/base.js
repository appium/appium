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
// TODO: rewrite this entire file using helper methods from mechanic?



UIAElementNil.prototype.type = function() {
    return "UIAElementNil";
}

UIAElement.prototype.type = function() {
    var type = this.toString();
    return type.substring(8, type.length - 1);
}

UIAElement.prototype.hasChildren = function() {
    var type = this.type();
    // NOTE: UIALink/UIAImage/UIAElement can have children
    return !(type === "UIAStaticText" || type === "UIATextField"
            || type === "UIASecureTextField" || type === "UIAButton"
            || type === "UIASwitch" || type === "UIAElementNil");
}

UIAElement.prototype.matchesTagName = function(tagName) {
    var type = this.type();
    // i.e. "UIALink" matches "link:
    return type.substring(3).toLowerCase() === tagName.toLowerCase();
}

UIAElement.prototype.matchesBy = function(tagName, text) {
    if (!this.matchesTagName(tagName))
        return false;
    if (text === '')
        return true;
    var name = this.name();
    if (name)
        name = name.trim();
    if (name === text)
        return true;
    var value = this.value();
    if (value)
        value = String(value).trim();
    return value === text;
}

// Finding elements

// @param by "type[/text]"
UIAElement.prototype.findElements = function(by) {
    var tagName;
    var text;
    var sep = by.indexOf('/');
    if (sep != -1) {
        tagName = by.substring(0, sep);
        text = by.substring(sep + 1);
    } else {
        tagName = by;
        text = '';
    }

    var foundElements = new Array();
    var findElements = function(element, tagName, text) {
        var children = element.elements();
        var numChildren = children.length;
        for ( var i = 0; i < numChildren; i++) {
            var child = children[i];
            if (child.matchesBy(tagName, text))
                foundElements.push(child);
            if (child.hasChildren()) // big optimization
                findElements(child, tagName, text);
        }
    };
    findElements(this, tagName, text);
    return foundElements;
};

// @param by "type[/text]"
UIAElement.prototype.findElement = function(by) {
    var tagName
    , text
    , sep = by.indexOf('/');
    if (sep != -1) {
        tagName = by.substring(0, sep);
        text = by.substring(sep + 1);
    } else {
        tagName = by;
        text = '';
    }

    var foundElement;
    var findElement = function(element, tagName, text) {
        var children = element.elements();
        var numChildren = children.length;
        var found;
        for (var i = 0; i < numChildren; i++) {
            var child = children[i];
            if (child.matchesBy(tagName, text)) {
                return child;
            }
            else if (child.hasChildren()) { // big optimization
                found = findElement(child, tagName, text);
                if (found)
                    return found;
            }
        }
    };
    return findElement(this, tagName, text);
};

var elements = new Array();
var globalElementCounter = 0;

UIAElement.prototype.getPageSource = function() {
  var output = "";
  var buildOutput = function(tree, depth) {
    var children = tree.children;
    var spaces = "";
    for (var i = 0; i < depth; i++) {
      spaces += "    ";
    }
    elStr = "<" + tree.type + ">";
    elStr += JSON.stringify({label: tree.label, name: tree.name, enabled: tree.enabled, valid: tree.valid, visible: tree.visible, rect: {x: tree.rect.origin.x, y: tree.rect.origin.y, w: tree.rect.size.width, h: tree.rect.size.height}});
    output += spaces + elStr + "\n";
    for (var i = 0; i < children.length; i++) {
      buildOutput(children[i], depth + 1);
    }
  };
  try {
    target.pushTimeout(0);
    buildOutput(this.getTree(), 0)
  } finally {
    target.popTimeout();
  }
  return {
    status: codes.Success.code,
    value: output
  };
}

UIAElement.prototype.getTree = function() {
  var target = UIATarget.localTarget();
  target.pushTimeout(0);
  var getTree = function(element) {
    var subtree = {
      name: element.name()
      , type: element.type()
      , label: element.label()
      , value: element.value()
      , rect: element.rect()
      , enabled: element.isEnabled()
      , valid: element.isValid()
      , visible: element.isVisible()
      , children: []
    };
    var children = element.elements();
    var numChildren = children.length;
    for ( var i = 0; i < numChildren; i++) {
      var child = children[i];
      subtree.children.push(getTree(child));
    }
    return subtree;
  };
  var tree = getTree(this);
  target.popTimeout();
  return tree
};



// getText

UIAElement.prototype.getText = function() {
    // TODO: tune as more cases are found
    var text;
    var type = this.type();
    if (type === "UIATextField" || type === "UIASecureTextField"
            || type === "UIATextView") {
        // value takes precedence for text fields
        text = this.value();
        if (!text)
            text = this.name();
        if (!text)
            text = "";
    } else {
        // name takes preference for others
        // i.e. <h1>title</h1> becomes: name="title", value="1"
        text = this.name();
        if (!text)
            text = this.value();
    }
    return {
      status: codes.Success.code,
      value: text
    };
}

// Keyboard

sendKeysToActiveElement = function(keys) {
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
}

hasSpecialKeys = function(keys) {
    var numChars = keys.length;
    for ( var i = 0; i < numChars; i++)
        if (isSpecialKey(keys.charAt(i)))
            return true;
    return false;
}

sendKeysToActiveElementSpecial = function(keys) {
    var keyboard = UIATarget.localTarget().frontMostApp().keyboard();
    var numChars = keys.length;
    for ( var i = 0; i < numChars; i++)
        typeKey(keyboard, keys.charAt(i));
    return {
      status: codes.Success.code,
      value: null
    };
}

// handles some of the special keys in org.openqa.selenium.Keys

isSpecialKey = function(k) {
    if (k === '\uE003') // DELETE
        return true;
    else if (k === '\uE006' || k === '\uE007') // RETURN ENTER
        return true;
    return false;
}

typeKey = function(keyboard, k) {
    if (k === '\uE003') // DELETE
        keyboard.keys()["Delete"].tap();
    else if (k === '\uE006' || k === '\uE007') // RETURN ENTER
        keyboard.buttons()["Go"].tap();
    else
        keyboard.typeString(String(k)); // regular key
}

// location/size/...

UIAElement.prototype.getElementLocation = function() {
    return {
      status: codes.Success.code,
      value: this.rect().origin
    };
}

UIAElement.prototype.getElementSize = function() {
    return {
      status: codes.Success.code,
      value: this.rect().size
    };
}

UIAElement.prototype.isDisplayed = function() {
  return {
    status: codes.Success.code,
    value: this.isVisible() == 1
  };
}

// touch

// does a flick in the middle of the screen of size 1/4 of screen
// using the direction corresponding to xSpeed/ySpeed
touchFlickFromSpeed = function(xSpeed, ySpeed) {
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
}

// similar to flick but does a longer movement in the direction of the swipe
// does a swipe in the middle of the screen of size 1/2 of screen
// using the direction corresponding to xSpeed/ySpeed
touchSwipeFromSpeed = function(xSpeed, ySpeed) {
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
}

// does a flick from a center of a specified element (use case: sliders)
UIAElement.prototype.touchFlick = function(xoffset, yoffset) {
  var options = {
        startOffset : {
            x : 0.5,
            y : 0.5
        },
        endOffset : {
            x : 0.5 + xoffset,
            y : 0.5 + yoffset
        }
    };

  this.flickInsideWithOptions(options);
  return {
    status: codes.Success.code,
    value: null
  };
}

// alerts

var getAlertText = function() {
  return {
    status: codes.Success.code,
    value: target.frontMostApp().alert().name()
  };
}

var acceptAlert = function() {
  target.frontMostApp().alert().defaultButton().tap()
  return {
    status: codes.Success.code,
    value: null
  };
}

var dismissAlert = function() {
  target.frontMostApp().alert().cancelButton().tap()
  return {
    status: codes.Success.code,
    value: null
  };
}
