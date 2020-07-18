## 对安卓输入事件的浅见




### 什么是输入事件


安卓操作系统使用事件概念来处理从不同输入设备接收到的信号。

它支持各种不同的设备，例如触摸屏，激光笔，鼠标，键盘，但其中大多数都使用从基本inputEvent类派生的MotionEvent或者KeyEvent API。这些API相当灵活，并支持各种不同的设置。我们对这些API中负责触摸和键盘事件生成/模拟的部分特别感兴趣。



### 输入事件如何工作

事件是用于响应来自输入设备的信号而生成的对象。这些对象之后会被传递到对应的内核子系统，由子系统处理这些对象，并通知所有监听进程关于点击，按键，滑动等操作。这就意味着，为了模拟由外部设备生成的信号（如触摸屏幕），发送具有与真实设备生成的属性与序列相同的事件对象是必要的。



### 让我们模拟一次点击

每个输入设备都有一组动作，这些动作的属性范围和序列已经在操作系统中预定义好。我们称这些动作为”点击“，”滑动“或者”双击“等。每个动作的属性都可以在安卓文档或者操作系统源码中找到。为了执行被识别为单击的事件序列，必须生成以下运动事件：

 - `ACTION_POINTER_DOWN`
 - 等待 125毫秒 (525毫秒或更长的等待时间将改为合成长按动作)

 - `ACTION_POINTER_UP`. 该 `downTime` 属性应设置为与 `ACTION_POINTER_DOWN`相同的时间戳

同样重要的是，开始事件和结束事件的坐标和其他属性都应相等，但`eventTime` 必须始终等于当前系统时间戳（以毫秒为单位，`SystemClock.uptimeMillis()`).

`MotionEvent`对象本身可以通过[obtain](https://developer.android.com/reference/android/view/MotionEvent#obtain(long,%20long,%20int,%20float,%20float,%20int)) API来创建，其参数是相应的事件属性。

事件创建后，必须将它们传递给系统去执行。这样的动作并不安全，因此只有在通过`IUiAutomationConnection` 接口的[injectInputEvent](https://android.googlesource.com/platform/frameworks/base/+/master/core/java/android/app/IUiAutomationConnection.aidl) 方法进行仪器化测试才有可能执行。这是一种非常低级的方法，而且只能在自动化测试中通过映射来访问。通常情况下，UiAutomator的 API有对应的修饰器模拟这些上文描述过的东西（如`touchDown`, `touchMove`等）



### 如何进行更复杂的动作

理论上，我们可以使用生成的时间序列来模拟任何输入动作。虽然，某些动作（如多指滑动）确实非常复杂，并且需要在正确的时间和属性下生成大量的事件。如果给定的事件不遵循内部操作要求，则操作系统会忽略这些事件。我们也能从UiAutomator框架中获得一点点的帮助，因为谷歌只封装了有限的简单动作，如`tap`, `drag` 或者 `swipe`。因此，为了生成两指滑动的动作，我们需要提供以下事件链：

 - `ACTION_POINTER_DOWN` (手指1)
 - `ACTION_POINTER_DOWN` (手指2)
 - 启动一个循环，每20ms为手指1和手指2生成`ACTION_POINTER_MOVE` 事件直到`ACTION_POINTER_UP` 被执行为止。`downTime` 的设置时间应该与`ACTION_POINTER_DOWN`一致。每个移动事件的坐标应该由相对起点和终点坐标之间点组成的。(x0 + sqrt(sqr(x0) + sqr(x1))) * k, y0 + sqrt(sqr(y0) + sqr(y1))) * k)
 - `ACTION_POINTER_UP` (手指1) `downTime` 应该设置为与 `ACTION_POINTER_DOWN`相对应的时间戳
 - `ACTION_POINTER_UP` (手指2) `downTime` 应该设置为与 `ACTION_POINTER_DOWN`相对应的时间戳

谷歌在UiAutomator代码中使用5ms作为两次移动时间之间的间隔时间，但是据我们的观察，这个值太小了，会导致执行动作明显延迟。



### 进一步阅读

不幸的是，关于这个主题没有太多详细的信息。唯一可靠的信息来源是安卓系统源码。可以考虑访问以下资源：


- https://android.googlesource.com/platform/frameworks/base/+/master/core/java/android/view/ViewConfiguration.java
- https://android.googlesource.com/platform/frameworks/uiautomator/+/refs/heads/master
- https://github.com/appium/appium-uiautomator2-server/tree/master/app/src/main/java/io/appium/uiautomator2/utils/w3c
- https://github.com/appium/appium-uiautomator2-server/tree/master/app/src/test/java/io/appium/uiautomator2/utils/w3c
- https://github.com/appium/appium-espresso-driver/tree/master/espresso-server/app/src/androidTest/java/io/appium/espressoserver/lib/helpers/w3c