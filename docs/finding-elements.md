Finding and interacting with elements
=====================================

Appium supports a subset of the WebDriver locator strategies:

* find by "tag name" (i.e., ui component type)
* find by "name" (i.e., the text, label, or developer-generated ID a.k.a 'accessibilityIdentifier' of an element)
* find by "xpath" (i.e., an abstract representation of a path to an element, with certain constraints)

###Tag name mapping

You can use the direct UIAutomation component type name for the tag name, or use the simplified mapping (used in some examples below) found here:

https://github.com/appium/appium/blob/master/lib/devices/ios/uiauto/lib/mechanic.js#L29

Issues
------

There's a known issue with table cell elements becoming invalidated before there's time to interact with them. We're working on a fix

Examples
--------

### Find all the UIAButtons on the screen

WD.js:

```js
driver.elementsByTagName('button', function(err, buttons) {
  // tap all the buttons
  var tapNextButton = function() {
    var button = buttons.shift();
    if (typeof button !== "undefined") {
      button.click(function(err) {
        tapNextButton();
      })
    } else {
      driver.quit();
    }
  }
  tapNextButton();
});
```

Ruby:

```ruby
buttons = @driver.find_elements :tag_name, :button
buttons.each { |b| b.click }
```

Python:

```python
[button.click() for button in driver.find_elements_by_tag_name('button')]
```

### Find the element with the text (or accessibilityIdentifier) "Go"

WD.js:

```js
driver.elementByName('Go', function(err, el) {
  el.tap(function(err) {
    driver.quit();
  });
});
```

Ruby:

```ruby
@driver.find_element(:name, 'Go').click
```
Python:

```python
driver.find_element_by_name('Go').click()
```

### Find the nav bar text element where the text begins with "Hi, "

WD.js:

```js
driver.elementByXpath('//navigationBar/text[contains(@value, "Hi, ")]', function(err, el) {
  el.text(function(err, text) {
    console.log(text);
    driver.quit();
  });
});
```

Ruby:

```ruby
@driver.find_element :xpath, '//navigationBar/text[contains(@value, "Hi, ")]'
```

### Find an element by tagName

Java:

```java
driver.findElement(By.tagName("button")).sendKeys("Hi");

WebELement element = findElement(By.tagName("button"));
element.sendKeys("Hi");

List<WebElement> elems = findElements(By.tagName("button"));
elems.get(0).sendKeys("Hi");
```

Python:

```python
driver.find_elements_by_tag_name('tableCell')[5].click()
```

# FindAndAct<a name="findandact"></a>

If you want, you can find and act on an element in a single command (iOS-only).
For example, you can find and click on an element in one call to Appium, using a special `mobile: findAndAct` command.

Python:

```python
args = {'strategy': 'tag_name', 'selector': 'button', 'action': 'tap'}
driver.execute_script("mobile: findAndAct", args)
```

### Pull to refresh using a swipe gesture

Python:

```python
js_snippet = "mobile: swipe"
args = {'startX':0.5, 'startY':0.2, 'startX':0.5, 'startY':0.95, 'tapCount':1, 'duration':10}
driver.execute_script(js_snippet, args)
```

Note: driver.execute_script() is explained in [Automating Mobile Gestures: Alternative access method](https://github.com/appium/appium/wiki/Automating-mobile-gestures))

Using The Appium Inspector To Locate Elements
--------

Appium provides you with a neat tool that allows you to find the the elements you're looking for without leaving the Appium app. With the Appium Inspector (the i symbol next to the start test button) you can find any element and it's name by either clicking the element on the preview page provided, or locating it in the UI navigator.

### Overview

The Appium inspector has a simple layout, complete with a UI navigator, a preview, and record and refresh buttons, and interaction tools.

![Step 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Overview.png)

### Example

After launching the Appium Inspector (you can do this by clicking the small "i" button in the top right of the app) you can locate any element in the preview. In this test, I'm looking for the id of the "show alert" button.

![Step 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Step1.png)

To find the id of this button, I click the "show alert" button in the inspector preview. The Appium inspector then highlights the element in the UI navigator, showing me both the id and element type of the button I clicked.

![Step 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Step2.png)
