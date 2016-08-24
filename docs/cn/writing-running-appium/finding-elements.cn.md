## 元素定位与交互

Appium支持webdriver定位策略的子集

* 根据"class"定位(例如， UI组件类型)
* 根据"xpath"定位 (例如，具有一定约束的路径抽象标示, 基于XPath方式)

另外， Appium 还支持部分 [Mobile JSON 连接协议](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md) 的定位策略

* `ios uiautomation`: 一个递归地、对应使用 [UIAutomation library](ios_predicate.cn.md) 搜索元素的字符串(iOS-only)
* `android uiautomator`: 一个递归地、对应使用 [UiAutomator Api](uiautomator_uiselector.cn.md)搜索元素的字符串 (Android-only)
* `accessibility id`: 一个递归地、使用本地Accessibility选项实现的Id/Name进行元素搜索的字符串。

### 存在的问题

如果遇到定位元素变得无效请联系并告知我们。我们将会努力修复

### 使用Appium Inspector来定位元素

(翻译备注: 这个工具目前只有Mac版本, 如果你使用的是windows, 可以使用android sdk自带的 uiautomatorviewer 工具来获得元素的位置)

Appium提供了一个灵活的工具Appium Inspector, 允许你在app运行的时候, 直接定位你正在关注的元素. 通过Appium Inspector(靠近start test按钮的小"i"按钮), 你可以通过点击预览窗口上的控件来获得它的name属性, 或者直接在UI导航窗口中定位

#### 概述

Appium Inspector有一个简单的布局, 全部由如下窗口组成.
UI导航器, 预览, 录制与刷新按钮, 和交互工具

![Step 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Overview.png)

#### 例子

启动Appium Inspector后(通过点击app右上的小"i"按钮), 你可以定位任何预览窗口中的元素. 作为测试, 我正在查找id为"show alert"的按钮

![Step 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Step1.png)

要找到这个按钮的id, 在定位预览窗口中我点击了"show alert"按钮, Appium Inspector在UI导航窗口中高亮显示了这个元素, 然后展示了刚被点击按钮的id和元素类型

![Step 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Step2.png)