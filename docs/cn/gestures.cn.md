使移动手势自动化
==========================
当selenium webDriver 提供某些交互功能的支持时，它的参数并不总是能很容易的映射到底层自动化设备（比如ios中的UIAutomation）所提供的功能。为此，Appium在WebDriver 之上为移动手势增加了额外的命令和参数。

* **点击**（在屏幕或者元素上）选项
	* 手指个数
	* 点击时长
	* 点击次数
	* 点击屏幕或元素的精确位置
* **轻触**（在屏幕或者元素上）选项
	* 手指个数
	* 轻触开始位置
	* 轻触结束位置
* **拖动**（在屏幕或者元素上）选项
	* 手指个数
	* 拖动持续时长
	* 拖动开始位置
	* 拖动结束位置
* **滑动到**（元素）
* **滑动**
* **摇晃**
* **长按** (元素)
* 设置 **orientation** 选项:
  * 新方向 (横屏或者竖屏)

## JSON Wire 协议服务器扩展
使用下面的这些接口，我们在这个spec上，额外做了一些扩展。

**注意:坐标** 下面列出的所有X和Y参数都可以通过两种方式使用。它们取值  0 到 1 之间，比如 0.5 ，它被视为屏幕尺寸或者元素尺寸的百分比。换句话说，’{x: 0.5 , y: 0.25}’意思是坐标为屏幕/元素长度的 50% ，屏幕/元素高度的 25% 。如果取值大于 1 ，它们将被看做像素。那么，坐标’{x: 100,y: 300}’就表示距离屏幕/元素左边 100 像素，距离屏幕/元素上边 300 像素。

**注意：在屏幕与元素上执行操作** 这些方法都接受一个可选的’element’参数。如果存在，它将被当做已被检索元素的ID。因此，在这种情况下，该坐标只与特定元素所占矩形区域有关。所以’{x: 0.5 , y: 0.5 ,element:’3’}’的意思是元素ID为 3 的中心点坐标处。

* `POST session/:sessionId/touch/tap` - 在屏幕或者元素上执行一次点击
    * URL 参数：要路由到会话的会话id
    * JSON 参数：
        * `tapCount` (可选, 默认 `1`): 点击次数
        * `touchCount` (可选, 默认 `1`): 触摸数量
        * `duration` (可选, 默认 `0.1`): 点击持续时间，单位秒
        * `x` (可选, 默认 `0.5`): 点击位置的x坐标（像素或者相对比例）
        * `y` (可选, 默认 `0.5`): 点击位置的y坐标（像素或者相对比例）
        * `element` (可选): 元素ID
* `POST session:/sessionId/touch/flick_precise` - 在屏幕或者元素上执行一次轻触
    * URL参数：要路由到会话的会话id
    * JSON 参数:
        * `touchCount` (可选, 默认 `1`): 触摸数量
        * `startX` (可选, 默认 `0.5`): 轻触起点的x坐标（像素或者相对比例）
        * `startY` (可选, 默认 `0.5`): 轻触起点的y坐标（像素或者相对比例）
        * `endX` (必选): 轻触终点的x坐标（像素或者相对比例）
        * `endY` (必选): 轻触终点的y坐标（像素或者相对比例）
        * `element` (可选): 元素ID
* `POST session:/sessionId/touch/swipe` - 在屏幕或者元素上执行一次拖动
    * URL参数：要路由到会话的会话id
    * JSON 参数:
        * `touchCount` (可选, 默认 `1`): 触摸数量
        * `startX` (可选, 默认 `0.5`): 拖动起点的x坐标（像素或者相对比例）)
        * `startY` (可选, 默认 `0.5`): 拖动起点的y坐标（像素或者相对比例）
        * `endX` (必选): 拖动终点的x坐标（像素或者相对比例）
        * `endY` (必选): 拖动终点的y坐标（像素或者相对比例）
        * `duration` (可选, 默认 `0.8`): 持续时间，单位：秒
        * `element` (可选): 元素ID

**注意：设置方向** 设置屏幕方向传入的参数与点击，轻触，拖动等方法传入的参数不同。这个动作是由屏幕的方向设置为“横向”或者“竖向”执行。下面的替换方法不适用于设置方向。

* `POST /session/:sessionId/orientation` - 设置屏幕的方向
    * URL 参数：sessionId
    * JSON 参数:
        * `orientation` (必选): 新的方向，要么“横屏”要么“竖屏”

## 可供选择的方法
扩展JSON Wire协议的确很棒，但这意味着绑定的各式各样WebDriver语言将不得不用自己的方式实现对这些端点的访问。当然，用自己方式实现所花费的时间多少取决于不同的项目。我们已经制定了一个方法来解决这个延迟，使用带有特殊参数的`driver.execute()`方法。

`POST session/:sessionId/execute` 两个JSON参数:
  * `script` (通常为一段js脚本)
  * `args` (通常为要传入这段js脚本的参数数组)

在这些新的移动方法的情况下，`script`必须为下面情况之一:
  * `mobile: tap`
  * `mobile: flick`
  * `mobile: swipe`
  * `mobile: scrollTo`
  * `mobile: shake`
( `mobile:` 前缀让我们来路由这些请求到相应的端点).

`args`是一个元素的数组：一个javascript对象为相应功能定义的参数。比如说，我想在屏幕的某个位置调用‘tap’，我可以调用`driver.execute`，传入这些JSON参数：

```json
{
  "script": "mobile: tap",
  "args": [{
    "x": 0.8,
    "y": 0.4
  }]
}
```
在这个例子中，`tap`方法被调用，使用上面定义的`x` and `y`参数。

##示例代码
注意：在这些示例中，参数都是可选的。

### 点击
* **WD.js:**

  ```js
  driver.elementsByTagName('tableCell', function(err, els) {
    var tapOpts = {
      x: 150 // 距离左边的像素值
      , y: 30 // 距离上边的像素值
      , element: els[4].value // 想要执行tap事件的元素id
    };
    driver.execute("mobile: tap", [tapOpts], function(err) {
      // 继续测试
    });
  });
  ```

* **Java:**

  ```java
  WebElement row = driver.findElements(By.tagName("tableCell")).get(4);
  JavascriptExecutor js = (JavascriptExecutor) driver;
  HashMap<String, Double> tapObject = new HashMap<String, Double>();
  tapObject.put("x", 150); // 距离左边的像素值
  tapObject.put("y", 30); // 距离右边的像素值
  tapObject.put("element", ((RemoteWebElement) row).getId()); // 想要执行tap事件的元素id
  js.executeScript("mobile: tap", tapObject);
  ```
  ```java
  //在iOS app中，如果UI 控件的visible属性为“false”，通过元素的位置进行点击.
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

### 轻触

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

### 拖动

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
  
### 滑动
 
 * **Java**
 
  ```java
  // 滑块值可设置为0到1的字符类型的值
  // 例如，"0.1" 表示 10%, "1.0" 表示 100%
  WebElement slider =  wd.findElement(By.xpath("//window[1]/slider[1]"));
  slider.sendKeys("0.1");
  ```

### 设置方向

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

### 滚动到

```ruby
  b = @driver.find_element :name, 'Sign In'
  @driver.execute_script 'mobile: scrollTo', :element => b.ref
```

### 长按
 
 * **c#**
 
  ```c#
  // 在元素上长按
  // 
  Dictionary<string, object> parameters = new Dictionary<string, object>();
  parameters.Add("using", _attributeType);
  parameters.Add("value", _attribute);
  Response response = rm.executescript(DriverCommand.FindElement, parameters);
  Dictionary<string, object> elementDictionary = response.Value as Dictionary<string, object>;
  string id = null;
  if (elementDictionary != null)
  {
     id = (string)elementDictionary["ELEMENT"];
  }
  IJavaScriptExecutor js = (IJavaScriptExecutor)remoteDriver;
  Dictionary<String, String> longTapObject = new Dictionary<String, String>();
  longTapObject.Add("element", id);
  js.ExecuteScript("mobile: longClick", longTapObject);
  ```