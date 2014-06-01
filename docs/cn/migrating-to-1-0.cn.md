# 把appium 0.18.x上的测试用例集迁移到appium1.x上

Appium 1.0 已经从先前的版本中移除了一部分过时的特性, 这个指导文档会帮助你了解使用Appium 1.0需要做的具体改变.

## 新的客户端库

你需要关注的最大的改变是利用新的appium的client libraries来替换原生的WebDriver ciients. 访问[Appium client list](appium-clients.md) 去寻找符合你自己编程语言的客户端库吧. 在每个客户端的网站上都可以找到用于集成到你代码中的依赖库相关介绍和下载

基本上, 你需要做如下的改变(以Python作为例子)

用
```
from appium import webdriver
```

替换原来的:

```
from selenium import webdriver
```

## 新的适配参数

下面的适配参数将不再使用
* `device`
* `version`

取而代之的是利用下面的配置参数

* `platformName` ("iOS" 或者 "Android")
* `platformVersion` (你希望测试的os版本)
* `deviceName` (你想用的设备, 比如 "iPhone Simulator")
* `automationName` ("Selendroid" 如果你想使用Selendroid的话, 否则可以省略)


`app` 配置参数保持不变, 但是特指非浏览器的app, 如果你想使用类似Safari或者Chrome这样的浏览器, 你需要设置`browserName`. 这代表`app`和`browserName`是互斥的.

我们把appium的配置参数都规范为驼峰拼写法(camelCase), 这代表着原来的`app-package`或者`app-wait-activity`现在会变成`appPackage`和`appWaitActivity`. 当然目前android的app package和activity都已经是自动探测了, 大部分情况下你可以省略这两个配置项.

## 新的定位方式

我们已经移除了下面的定位方式 

* `name`
* `tag name`

我们增加了`accessibility_id`定位方法去做过去`name`做的事情. 具体的细节还得跟你使用的Appium客户端库有关.

`tag name`已经被替换为`class name`. 所以想通过UI的类型来定位某个元素, 你需要使用class name定位方式

关于`class name`和`xpath`的定位方式: 现在需要使用完整的全类名, 这意味着如果你有一个如下的定位用的xpath

```
//table/cell/button
```
现在需要改成

```
//UIATableView/UIATableCell/UIAButton
```

如果是android的话, `button`需要改变成`android.widget.Button`

我们也增加了如下的定位方式

* `-ios uiautomation`
* `-android uiautomator`

根据你使用的客户端去相应的使用新的定位方式

## 使用xml, 不再是json了

App source方法先前返回JSON, 现在修改成返回XML. 所以如果你有代码是依赖解析app source的, 那么就需要更新

## 通过context支持混合应用, 不再是window了

以前混合app的切换支持是通过"windows"

* `window_handles`
* `window`
* `switch_to.window`

现在Appium支持"context" 概念了, 要获得当前环境下所有的上下文(contexts), 或者特定的context, 你可以用

```python
driver.contexts
current = driver.context
```

在这些context之间切换, 可以使用

```python
driver.switch_to.context("WEBVIEW")
```

## 没有了`execute_script("mobile: xxx")`

所有的`mobile:`方法都已经被移除, 并且被替换为appium client libraries的原生方法. 这意味着如果一个方法调用原来的方式是
`driver.execute("mobile: lock", [5])`
现在需要更新为
`driver.lock(5)` 
在这个地方`lock`已经变成了原生的客户端方法. 当然具体的调用细节在不同的客户端库中的实现可能会有所差别.

特别需要注意的是, 手势(gesture)方法已经被替换为TouchAction / MultiAction API, 它允许更强大通用的组合手势的自动化. 可以参考你的客户端库的具体用法.

这就是全部啦, 祝迁移愉快

(文档由testerhome.com翻译, 欢迎更多热爱技术的同学加入到翻译中来, We Love Appium)

