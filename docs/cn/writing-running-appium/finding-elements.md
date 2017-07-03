## 元素的定位与交互

Appium 支持 WebDriver 定位策略的子集：

* 通过 "class" 查找 (例如： UI 组件的类型)
* 通过 "xpath" 查找 (例如： 一个元素的路径以抽象的方式去表达，具有一定的约束)


Appium 还额外支持部分 [Mobile JSON Wire Protocol](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md) 的定位策略


* `-ios uiautomation`: 该字符串相当于使用 [UIAutomation 库](ios_predicate.md) 去递归地搜索元素（仅支持iOS 9.3 及以下的版本）
* `-android uiautomator`: 该字符串相当于使用 [UiAutomator Api](uiautomator_uiselector.md) 去递归地搜索元素（仅支持 Android）
* `accessibility id`: 该字符串相当于利用原生的可访问性（Accessibility）选项，使用 Id/Name 去递归地搜索元素。

### 已知问题

在我们要与 table cell 元素进行交互之前，元素会变成无效。这是已知的问题，我们会尽快修复。


### 使用 Appium Inspector 去定位元素

Appium 为我们提供了一个灵活的工具(Appium Inspector)，使你不退出 Appium 应用就能定位你要查找的元素。使用 Appium Inspector（靠近 start test 按钮旁的一个 "i" 按钮），你可以直接点击预览窗口上的控件来获取它的 name 属性，或者直接在 UI 导航器中定位元素。


### 概述

Appium inspector 界面布局十分简单，由以下几个部分组成：UI 导航器，预览窗口，录制按钮和刷新按钮，还有交互工具。

![步骤 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Overview.png)

### 例子

启动 Appium Inspector 后（也可以点击 Appium 应用右上方那个小小的 "i" 按钮去启动），你可以在预览窗口定位到任何元素。在本次测试中，我需要做的是找到 "show alert" 按钮的 id。

![步骤 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Step1.png)


为了找到这个按钮的 id，我在 inspector 的预览界面点击 "show alert" 按钮。然后 Appium inspector 就会在 UI 导航器高亮标记点击的元素，同时展示出我所点击的按钮的 id 和元素类型。

![步骤 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Step2.png)