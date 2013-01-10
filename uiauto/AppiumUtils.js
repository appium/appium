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

// Obtaining Device Property Information like Name, OS ver, Model etc

 function getDeviceDetail() {
    var deviceMap = new Object();
    deviceMap['deviceName'] = UIATarget.localTarget().name();
    deviceMap['deviceModel'] = UIATarget.localTarget().model();
    deviceMap['systemName'] = UIATarget.localTarget().systemName();
    deviceMap['systemVersion'] = UIATarget.localTarget().systemVersion();
    return deviceMap;
 }


// Misc utils

/* Deactivating the app for specified duration in Seconds. 
Useful to test multi-taskig (moving app to background) */
function deactivateApp(timeInSeconds){
 UIATarget.localTarget().deactivateAppForDuration(timeInSeconds);
}

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
    }
    findElements(this, tagName, text)
    return foundElements;
}

// @param by "type[/text]"
UIAElement.prototype.findElement = function(by) {
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

    var foundElement;
    var findElement = function(element, tagName, text) {
        var children = element.elements();
        var numChildren = children.length;
        for ( var i = 0; i < numChildren; i++) {
            var child = children[i];
            if (child.matchesBy(tagName, text)) {
                foundElement = child;
                return;
            }
            if (child.hasChildren()) { // big optimization
                findElement(child, tagName, text);
                if (foundElement)
                    return;
            }
        }
    }
    findElement(this, tagName, text)
    return foundElement;
}

var elements = new Array();
var globalElementCounter = 0;

// @return [{'ELEMENT': var_name}, ...]
UIAElement.prototype.findElementsAndSetKeys = function(by) {
    var json = '[';
    var foundElements = this.findElements(by);
    for ( var i = 0; i < foundElements.length; i++) {
        var varName = 'wde' + globalElementCounter++;
        elements[varName] = foundElements[i];
        if (i > 0)
            json += ',';
        json += '{"ELEMENT":' + '"' + varName + '"' + '}';
    }
    json += ']';
    return json;
}

// @return var_namne
UIAElement.prototype.findElementAndSetKey = function(by) {
    var foundElement = this.findElement(by);
    if (foundElement) {
        var varName = 'wde' + globalElementCounter++;
        elements[varName] = foundElement;
        return varName;
    }
    return '';
}

// getPageSource

function tabSpacing(depth) {
    switch (depth) {
    case 0:
        return "";
    case 1:
        return "  ";
    case 2:
        return "    ";
    case 3:
        return "      ";
    case 4:
        return "        ";
    case 5:
        return "          ";
    }
    var space = "";
    for ( var i = 0; i < depth; i++)
        space += "  ";
    return space;
}

UIAElement.prototype.getPageSource = function() {
    var source = "";
    var appendPageSource = function(element, depth) {
        var children = element.elements();
        var numChildren = children.length;
        for ( var i = 0; i < numChildren; i++) {
            var child = children[i];
            appendElementSource(child, depth);
            if (child.hasChildren()) // big optimization
                appendPageSource(child, depth + 1);
        }
    }
    var appendElementSource = function(element, depth) {
        source += tabSpacing(depth) + element.type() + ':'
        var label = element.label();
        var name = element.name();
        var value = element.value();
        if (label)
            source += ' "' + label + '"';
        if (name)
            source += ' NAME:"' + name + '"';
        if (value)
            source += ' VALUE:"' + value + '"';
        var r = element.rect();
        source += ' {{' + Math.round(r.origin.x) + ',' + Math.round(r.origin.y)
                + '},{' + Math.round(r.size.width) + ','
                + Math.round(r.size.height) + '}}';
        // show element state
        source += ' [enabled=' + element.isEnabled() + ',valid='
                + element.isValid() + ',visible=' + element.isVisible() + ']';
        source += '\n'
    }
    var target = UIATarget.localTarget();
    try {
        target.pushTimeout(0);
        appendPageSource(this, 0)
    } finally {
        target.popTimeout();
    }
    return source;
}

// screenshot

function takeScreenshot(file) {
    var screenshot = UIATarget.localTarget().captureScreenWithName(file);
    return screenshot;
}

// screen orientation

function getScreenOrientation() {
    var orientation = UIATarget.localTarget().deviceOrientation();
    switch (orientation) {
    case UIA_DEVICE_ORIENTATION_UNKNOWN:
        return "UNKNOWN";
    case UIA_DEVICE_ORIENTATION_PORTRAIT:
        return "PORTRAIT";
    case UIA_DEVICE_ORIENTATION_PORTRAIT_UPSIDEDOWN:
        return "PORTRAIT";
    case UIA_DEVICE_ORIENTATION_LANDSCAPELEFT:
        return "LANDSCAPE";
    case UIA_DEVICE_ORIENTATION_LANDSCAPERIGHT:
        return "LANDSCAPE";
    case UIA_DEVICE_ORIENTATION_FACEUP:
        return "UNKNOWN";
    case UIA_DEVICE_ORIENTATION_FACEDOWN:
        return "UNKNOWN";
    }
    throw new Error("unsupported orientation: " + orientation);
}

function setScreenOrientation(orientation) {
    var target = UIATarget.localTarget();
    if (orientation === "LANDSCAPE")
        target.setDeviceOrientation(UIA_DEVICE_ORIENTATION_LANDSCAPELEFT);
    else if (orientation === "PORTRAIT")
        target.setDeviceOrientation(UIA_DEVICE_ORIENTATION_PORTRAIT);
    else
        throw new Error("unsupported orientation: " + orientation);
    return getScreenOrientation();
}

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
    } else {
        // name takes preference for others
        // i.e. <h1>title</h1> becomes: name="title", value="1"
        text = this.name();
        if (!text)
            text = this.value();
    }
    return text;
}

// timeouts

function setImplicitWait(seconds) {
    UIATarget.localTarget().setTimeout(seconds);
}

// Keyboard

sendKeysToActiveElement = function(keys) {
    if (hasSpecialKeys(keys)) {
        sendKeysToActiveElementSpecial(keys);
    } else {
        var keyboard = UIATarget.localTarget().frontMostApp().keyboard();
        keyboard.typeString(keys);
    }
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
    var origin = this.rect().origin;
    return '{"x":' + origin.x + ',"y":' + origin.y + '}';
}

UIAElement.prototype.getElementSize = function() {
    var size = this.rect().size;
    return '{"width":' + size.width + ',"height":' + size.height + '}';
}

UIAElement.prototype.isDisplayed = function() {
    return this.isVisible() == 1;
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
}
