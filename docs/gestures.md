Automating mobile gestures
==========================

While the Selenium WebDriver spec has support for certain kinds of mobile interaction, its parameters are not always easily mappable to the functionality that the underlying device automation (like UIAutomation in the case of iOS) provides. To that end, Appium augments the WebDriver spec with extra commands and parameters for mobile gestures:

* **tap** (on screen or on element) with options:
  * how many fingers
  * how long to tap
  * how many taps
  * where precisely to tap on the screen or element
* **flick** (on screen or on element) with options:
  * how many fingers
  * where to start the flick on screen or element
  * where to end the flick on screen or element
* **swipe/drag** (on screen or on element) with options:
  * how many fingers
  * how long the swipe/drag takes in seconds
  * where to start the swipe on screen or element
  * where to end the swipe on screen or element
* **scroll to** (element)
* **slider**
* **shake**
* set the **orientation** with option:
  * new orientation (landscape or portrait)

## JSON Wire Protocol server extensions
Here are the endpoints with which we have implemented these additions to the spec.

**Note on coordinates:** All the X and Y parameters listed below can be used in two ways. If they are between 0 and 1 (e.g., 0.5), they are taken to be percentage of screen or element size. In other words, `{x: 0.5, y: 0.25}` means a coordinate that is 50% from the left side of the screen/element, and 25% from the top of the screen/element. If the values are greater than 1, they are taken as pixels. So, `{x: 100, y: 300}` means a coordinate that is 100 pixels from the left and 300 from the top of the screen/element.

**Note on performing actions on screen vs elements:** These methods all take an optional `element` parameter. If present, this is taken to be the ID of an element which has already been retrieved. So in this case, the coordinates will be taken to refer to the rectangle of that element only. So `{x: 0.5, y: 0.5, element: '3'}` means "the exact middle point of the element with ID '3'".

* `POST session/:sessionId/touch/tap` - perform a tap on the screen or an element
    * URL Parameter: sessionId of session to route to
    * JSON parameters:
        * `tapCount` (optional, default `1`): how many times to tap
        * `touchCount` (optional, default `1`): how many fingers to tap with
        * `duration` (optional, default `0.1`): how long (in seconds) to tap
        * `x` (optional, default `0.5`): x coordinate to tap (in pixels or relative units)
        * `y` (optional, default `0.5`): y coordinate to tap (in pixels or relative units)
        * `element` (optional): ID of element to scope this command to
* `POST session:/sessionId/touch/flick_precise` - perform a flick on the screen or an element
    * URL Parameter: sessionId of session to route to
    * JSON parameters:
        * `touchCount` (optional, default `1`): how many fingers to flick with
        * `startX` (optional, default `0.5`): x coordinate where flick begins (in pixels or relative units)
        * `startY` (optional, default `0.5`): y coordinate where flick begins (in pixels or relative units)
        * `endX` (required): x coordinate where flick ends (in pixels or relative units)
        * `endY` (required): y coordinate where flick ends (in pixels or relative units)
        * `element` (optional): ID of element to scope this command to
* `POST session:/sessionId/touch/swipe` - perform a swipe/drag on the screen or an element
    * URL Parameter: sessionId of session to route to
    * JSON parameters:
        * `touchCount` (optional, default `1`): how many fingers to flick with
        * `startX` (optional, default `0.5`): x coordinate where swipe begins (in pixels or relative units)
        * `startY` (optional, default `0.5`): y coordinate where swipe begins (in pixels or relative units)
        * `endX` (required): x coordinate where swipe ends (in pixels or relative units)
        * `endY` (required): y coordinate where swipe ends (in pixels or relative units)
        * `duration` (optional, default `0.8`): time (in seconds) to spend performing the swipe/drag
        * `element` (optional): ID of element to scope this command to

**Note on setting orientation:** Setting the orientation takes different parameters than the tap, flick, and swipe methods. This action is performed by setting the orientation of the browser to "LANDSCAPE" or "PORTRAIT". The alternative access method below does not apply to setting orientation.

* `POST /session/:sessionId/orientation` - set the orientation of the browser
    * URL Parameter: sessionId of session to route to
    * JSON parameters:
        * `orientation` (required): new orientation, either "LANDSCAPE" or "PORTRAIT"

## Alternative access method
Extending the JSON Wire Protocol is great, but it means that the various WebDriver language bindings will have to implement access to these endpoints in their own way. Naturally, this will take different amounts of time depending on the project. We have instituted a way to get around this delay, by using `driver.execute()` with special parameters.

`POST session/:sessionId/execute` takes two JSON parameters:
  * `script` (usually a snippet of javascript)
  * `args` (usually an array of arguments passed to that snippet in the javascript engine)

In the case of these new mobile methods, `script` must be one of:
  * `mobile: tap`
  * `mobile: flick`
  * `mobile: swipe`
  * `mobile: scrollTo`
  * `mobile: shake`
(The `mobile:` prefix allows us to route these requests to the appropriate endpoint).

And `args` will be an array with one element: a Javascript object defining the parameters for the corresponding function. So, let's say I want to call `tap` on a certain screen position. I can do so by calling `driver.execute` with these JSON parameters:

```json
{
  "script": "mobile: tap",
  "args": [{
    "x": 0.8,
    "y": 0.4
  }]
}
```
In this example, our new `tap` method will be called with the `x` and `y` params as described above.

## Code examples
In these examples, note that the element parameter is always optional.

### Tap
* **WD.js:**

  ```js
  driver.elementsByTagName('tableCell', function(err, els) {
    var tapOpts = {
      x: 150 // in pixels from left
      , y: 30 // in pixels from top
      , element: els[4].value // the id of the element we want to tap
    };
    driver.execute("mobile: tap", [tapOpts], function(err) {
      // continue testing
    });
  });
  ```

* **Java:**

  ```java
  WebElement row = driver.findElements(By.tagName("tableCell")).get(4);
  JavascriptExecutor js = (JavascriptExecutor) driver;
  HashMap<String, Double> tapObject = new HashMap<String, Double>();
  tapObject.put("x", 150); // in pixels from left
  tapObject.put("y", 30); // in pixels from top
  tapObject.put("element", ((RemoteWebElement) row).getId()); // the id of the element we want to tap
  js.executeScript("mobile: tap", tapObject);
  ```
  ```java
  //In iOS app, if UI element visbile property is "false". 
  //Using element location tap on it.
  WebElement element = wd.findElement(By.xpath("//window[1]/scrollview[1]/image[1]"));
  JavascriptExecutor js = (JavascriptExecutor) wd;
  HashMap<String, Double> tapObject = new HashMap<String, Double>();
  tapObject.put("x", (double) element.getLocation().getX()); 
  tapObject.put("y", (double) element.getLocation().getY()); 
  tapObject.put("duration", 0.1);
  js.executeScript("mobile: tap", tapObject);
  ```
* **Python:**

  ```python
  driver.execute_script("mobile: tap", {"touchCount":"1", "x":"0.9", "y":"0.8", "element":element.id})
  ```

* **Ruby:**

  ```ruby
  @driver.execute_script 'mobile: tap', :x => 150, :y => 30
  ```

* **Ruby:**

  ```ruby
  b = @driver.find_element :name, 'Sign In'
  @driver.execute_script 'mobile: tap', :element => b.ref
  ```

* **C#:**

  ```C#
  Dictionary<String, Double> coords = new Dictionary<string, double>();
  coords.Add("x", 12);
  coords.Add("y", 12);
  driver.ExecuteScript("mobile: tap", coords);
  ```

### Flick

* **WD.js:**

  ```js
  // options for a 2-finger flick from the center of the screen to the top left
  var flickOpts = {
    endX: 0
    , endY: 0
    , touchCount: 2
  };
  driver.execute("mobile: flick", [flickOpts], function(err) {
    // continue testing
  });
  ```

* **Java:**

  ```java
  JavascriptExecutor js = (JavascriptExecutor) driver;
  HashMap<String, Double> flickObject = new HashMap<String, Double>();
  flickObject.put("endX", 0);
  flickObject.put("endY", 0);
  flickObject.put("touchCount", 2);
  js.executeScript("mobile: flick", flickObject);
  ```

### Swipe

* **WD.js:**

  ```js
  // options for a slow swipe from the right edge of the screen to the left
  var swipeOpts = {
    startX: 0.95
    , startY: 0.5
    , endX: 0.05
    , endY: 0.5
    , duration: 1.8
  };
  driver.execute("mobile: swipe", [swipeOpts], function(err) {
    // continue testing
  });
  ```

* **Java:**

  ```java
  JavascriptExecutor js = (JavascriptExecutor) driver;
  HashMap<String, Double> swipeObject = new HashMap<String, Double>();
  swipeObject.put("startX", 0.95);
  swipeObject.put("startY", 0.5);
  swipeObject.put("endX", 0.05);
  swipeObject.put("endY", 0.5);
  swipeObject.put("duration", 1.8);
  js.executeScript("mobile: swipe", swipeObject);
  ```
  
### Slider
 
 * **Java**
 
  ```java
  // slider values can be string representations of numbers between 0 and 1
  // e.g., "0.1" is 10%, "1.0" is 100%
  WebElement slider =  wd.findElement(By.xpath("//window[1]/slider[1]"));
  slider.sendKeys("0.1");
  ```

### Set orientation

* **WD.js:**
  ```js
  driver.setOrientation("LANDSCAPE", function(err) {
    // continue testing
  });
  ```

* **Python:**
  ```python
  driver.orientation = "LANDSCAPE"
  ```
