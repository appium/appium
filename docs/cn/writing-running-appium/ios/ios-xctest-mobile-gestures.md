## 使用 WebDriverAgent/XCTest Backend 进行iOS自动化手势操作

很可惜，苹果官方的 XCTest 框架本身并不支持 TouchAction 接口实现的 W3C 标准。尽管如此，XCTest 提供了非常丰富的手势操作，这些操作都是 iOS 平台独有的。你可以在 1.6.4-beta 版本的 Appium 中开始使用这些手势操作。

需要特别注意的是目前XCTest和WDA正在不断优化改变的阶段，这意味着所有 `mobile: *` 的命令可能会在没任何通知的情况下就被调整更改。


### mobile: swipe

这个手势是在指定的屏幕上的控件或App的控件上执行“滑动”操作，一般是针对整个屏幕。这个方法不支持通过坐标来操作，并且仅仅是简单的模拟单个手指滑动。这个方法对于诸如相册分页、切换视图等情况可能会发挥比较大的作用。更复杂的场景可能需要用到`mobile:dragFromToForDuration`，这个方法支持传坐标（coordinates ）和滑动持续时间（duration）。


#### 支持参数

 * _direction_: 'up', 'down', 'left' or 'right'.  这4个参数是固定的。
 * _element_: 需要滑动的控件ID（作为十六进制哈希字符串）。如果没有提供该参数的话，则会使用App的控件作为替代。

#### 用法示例

```java
// Java
JavascriptExecutor js = (JavascriptExecutor) driver;
Map<String, Object> params = new HashMap<>();
scrollObject.put("direction", "down");
scrollObject.put("element", ((RemoteWebElement) element).getId());
js.executeScript("mobile: swipe", params);
```


### mobile: scroll

滚动元素或整个屏幕。支持不同的滚动策略。该方法提供了4个可选择滑动策略：按照顺序有“name”，“direction”，“predicateString”或“toVisible”。所有的滑动策略都是排他性的，一次滑动只能选择一个策略。你可以使用`mobile:scroll`来对表格中或者集合视图中的某个已知控件进行精确的滚动操作。然而目前有一个已知的局限问题：如果需要在父容器上执行太多的滚动手势来达到必要的子元素（其中几十个），则方法调用可能会失败。

#### 支持参数

 * _element_: 需要滚动的控件ID（作为十六进制哈希字符串）。如果没有提供该参数的话，则会使用App的控件作为替代。
 * _name_: 需要执行滚动的子控件的`accessibility id`。
 将`predicateString`参数设置为`“name == accessibilityId”`可以实现相同的结果。如果`element`不是容器，则不起作用。
 * _direction_:  'up', 'down', 'left' or 'right'. 该参数与`swipe`中的比，差别在于`scroll`会尝试将当前界面完全移动到下一页。（`page`一词表示单个设备屏幕中的所有内容）
 * _predicateString_: 需要被执行滚动操作的子控件的NSPredicate定位器。如果控件不是容器，则不起作用。
 * _toVisible_: 布尔类型的参数。如果设置为`true`，则表示要求滚动到父控件中的第一个可见到的子控件。如果`element`未设置，则不生效。

#### 用法示例

```python
# Python
driver.execute_script('mobile: scroll', {'direction': 'down'});
```


### mobile: pinch

在给定的控件或应用程序控件上执行捏合手势。

#### 支持参数

 * _element_: 需要捏合的控件ID（作为十六进制哈希字符串）。如果没有提供该参数的话，则会使用App的控件作为替代。
 * _scale_: 浮动型夹点尺度。使用0和1之间的比例来“捏紧”或缩小，大于1的比例“撑开”或放大。强制参数
 * _velocity_: 每秒缩放速度（浮点值）。强制参数

#### 用法示例

```ruby
# Ruby
execute_script 'mobile: pinch', scale: 0.5, velocity: 1.1, element: element.ref
```


### mobile: doubleTap

在指定控件上或屏幕上执行双击手势。

#### 支持参数

 * _element_: 需要双击的控件ID（作为十六进制哈希字符串）。如果没有提供该参数的话，则会使用App的控件作为替代。
 * _x_: 屏幕x轴坐标点，浮点型. 仅当`element`未设置时才是强制参数
 * _y_: 屏幕y轴坐标点，浮点型. 仅当`element`未设置时才是强制参数

#### 用法示例

```javascript
// javascript
driver.execute('mobile: doubleTap', {element: element.value.ELEMENT});
```


### mobile: touchAndHold

在指定控件上或屏幕上长按的手势操作。

#### 支持参数

 * _element_: 需要长按的控件ID（作为十六进制哈希字符串）。如果没有提供该参数的话，则会使用App的控件作为替代。
 * _duration_: 长按的持续时间（秒），浮点型。强制性参数
 * _x_: 屏幕x轴坐标点，浮点型. 仅当`element`未设置时才是强制参数
 * _y_: 屏幕y轴坐标点，浮点型. 仅当`element`未设置时才是强制参数

#### 用法示例

```csharp
// c#
Dictionary<string, object> tfLongTap = new Dictionary<string, object>();
tfLongTap.Add("element", element.Id);
tfLongTap.Add("duration", 2.0);
((IJavaScriptExecutor)driver).ExecuteScript("mobile: touchAndHold", tfLongTap);
```


### mobile: twoFingerTap

在给定元素或应用程序元素上执行两个手指点击手势。

#### 支持参数

 * _element_: 需要两只手指操作的控件ID（作为十六进制哈希字符串）。如果没有提供该参数的话，则会使用App的控件作为替代。

#### 用法示例

```csharp
// c#
Dictionary<string, object> tfTap = new Dictionary<string, object>();
tfTap.Add("element", element.Id);
((IJavaScriptExecutor)driver).ExecuteScript("mobile: twoFingerTap", tfTap);
```


### mobile: tap

在指定控件或屏幕上的坐标执行点击手势。

#### 支持参数

 * _element_: 控件ID（作为十六进制哈希字符串）。 如果设置 了`element`参数，则`x`、`y`代表的是以当前`element`为边界的xy轴。若未设置，则`x`,`y`代表的是以手机屏幕为边界。
 * _x_: x轴坐标，类型为float。强制参数
 * _y_: y轴坐标，类型为float。强制参数

#### 案例

```php
// PHP
$params = array(array('x' => 100.0, 'y' => 50.0, 'element' => element.GetAttribute("id")));
$driver->executeScript("mobile: tap", $params);
```


### mobile: dragFromToForDuration

通过坐标点执行拖放手势。可以在控件上执行，也可以在屏幕上执行。

#### Supported arguments

 * _element_: 控件ID（作为十六进制哈希字符串）。 如果设置 了`element`参数，则`x`、`y`代表的是以当前`element`为边界的xy轴。若未设置，则`x`,`y`代表的是以手机屏幕为边界。
 * _duration_: 浮点数范围[0.5,60]。表示开始拖动点之前的点击手势需要多长时间才能开始拖动。强制参数
 * _fromX_: 起始拖动点的x坐标（类型float）。强制参数
 * _fromY_: 起始拖动点的y坐标（类型float）。强制参数
 * _toX_: 结束拖曳点的x坐标（float类型）。强制参数
 * _toY_: 结束拖动点的y坐标（类型float）。强制参数

#### 用法示例

```java
// Java
JavascriptExecutor js = (JavascriptExecutor) driver;
Map<String, Object> params = new HashMap<>();
params.put("duration", 1.0);
params.put("fromX", 100);
params.put("fromY", 100);
params.put("toX", 200);
params.put("toY", 200);
params.put("element", ((RemoteWebElement) element).getId());
js.executeScript("mobile: dragFromToForDuration", params);
```


### mobile: selectPickerWheelValue

选择下一个或上一个picker wheel的值。 如果这些值是动态的，那么这个方法是能起作用的。XCTest有一个BUG就是你并不能知道要选择哪一个或者当前的选择区域是否生效。

#### 支持参数

 * _element_: PickerWheel的内部元素id（作为十六进制哈希字符串）执行值选择。元素必须是XCUIElementTypePickerWheel类型。强制参数
 * _order_:  `next` 选择下一个value，`previous`选择前面一个value。强制参数
 * _offset_: 区间值： [0.01, 0.5]。它定义了picker wheel的中心距离应该有多远。 通过将该值乘以实际的picker wheel高度来确定实际距离。太小的偏移值可能不会改变picker wheel的值，而过高的值可能会导致picker wheel同时切换两个或多个值。通常最优值位于范围[0.15,0.3]中。默认为0.2

#### 用法示例

```java
// Java
JavascriptExecutor js = (JavascriptExecutor) driver;
Map<String, Object> params = new HashMap<>();
params.put("order", "next");
params.put("offset", 0.15);
params.put("element", ((RemoteWebElement) element).getId());
js.executeScript("mobile: selectPickerWheelValue", params);
```


### mobile: alert

对NSAlert实例执行操作。

#### 支持参数

 * _action_: 支持以下操作: `accept`, `dismiss` and `getButtons`。强制参数
 * _buttonLabel_:  点击已有警报按钮的标签文本。这是一个可选参数，只能与`accept`和`dismiss` 操作相结合才有效。

#### 用法示例

```python
# Python
driver.execute_script('mobile: alert', {'action': 'accept', 'buttonLabel': 'My Cool Alert Button'});
```


### 进阶主题

查看 [WDA Element Commands API](https://github.com/facebook/WebDriverAgent/blob/master/WebDriverAgentLib/Commands/FBElementCommands.m)
以获取有关在Facebook WebDriverAgent中实现的手势的信息。

本文由 大东 翻译，由 lihuazhang 校验。
