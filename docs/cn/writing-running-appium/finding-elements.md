## 元素的定位与交互

Appium 支持 WebDriver 定位策略的子集：

* 通过 "class" 查找 (例如， UI 组件的类型)
* 通过 "xpath" 查找 (例如， 一个元素的路径以抽象的方式去表达，具有一定的约束)

你可以查看关于以上的列表，[选择器策略](/docs/en/commands/element/find-elements.md#selector-strategies) (English)。

Appium 还额外支持部分 [Mobile JSON Wire Protocol](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md) 的定位策略。

* `-ios predicate string`：相当于使用 [iOS Predicate](/docs/cn/writing-running-appium/ios/ios-predicate.md) 去递归地搜索元素（iOS 10.0 及以上版本）
    * `-ios uiautomation` 用于 iOS 9.3 及以下版本
* `-android uiautomator`：相当于使用 [UiAutomator Api](/docs/cn/writing-running-appium/android/uiautomator-uiselector.md) 去递归地搜索元素（Android 专属）
* `-android datamatcher`：相当于一个 [Espresso DataMatcher json](/docs/en/writing-running-appium/android/espresso-datamatcher-selector.md) (Android 专属)
* `accessibility id`：该字符串相当于利用原生的可访问性（Accessibility）选项，使用 Id / Name 去递归地搜索元素。

最后，Appium 支持几个额外的实验性定位策略：

* `-image`: 字符串对应图像的 base64 编码版本，Appium 将使用该字符串作为模板来查找匹配的屏幕区域，然后将其视为元素点击。关于该定位器策略的更多信息，请参见文档 [定位图像中的元素](/docs/en/advanced-concepts/image-elements.md) (English)。
* `-custom`: 该字符串将被发送到一个通过 `customFindModules` 功能注册的元素定位插件。关于该定位器策略的更多信息，请参见文档 [用于定位元素的插件](/docs/en/advanced-concepts/element-finding-plugins.md) (English)。

### 已知问题

在我们要与表格 cell 元素进行交互之前，元素便已失效，这是已知的问题。我们正在修复它。

### 使用 Appium Desktop 去找出元素的位置

Appium 提供了一个简洁的工具，供你查找要定位的元素。使用 [Appium Desktop](https://github.com/appium/appium-desktop)，你可以通过单击屏幕截图上的元素或在源代码树进行定位，找到任何元素及其定位器。

### 概述

Appium Desktop 有一个简洁的布局，由源代码树、屏幕截图、记录和刷新按钮、交互工具构成。

![](https://github.com/appium/appium-desktop/raw/master/docs/images/screen-inspector-and-logs.png)

### 示例

启动 Appium Desktop 并开始会话后，可以定位任何元素。在这个测试中，我正在寻找「Compute Sum」按钮的 accessibility id。

为了寻找「Compute Sum」按钮的 accessibility id，我在屏幕截图中单击「Compute Sum」按钮。该元素会在源代码树中高亮突出显示。我可以在右边的面板中看到 accessibility id。

![](https://github.com/appium/appium-desktop/raw/master/docs/images/screen-inspector.png)

### REPL
[REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop) 是一个简单的交互式语言外壳。你可以交互式地调用各种命令。它将帮助你确保场景与 Appium 服务器交互。

---
EOF.

本文由 [thanksdanny](https://testerhome.com/thanksdanny) 翻译。由 [lihuazhang](https://github.com/lihuazhang) 校验。

翻译：@[Pandorym](https://github.com/Pandorym)
Last english version: 438d6c3b38e785edc701354cf660aa9f76baceaf, Apr 11, 2019
