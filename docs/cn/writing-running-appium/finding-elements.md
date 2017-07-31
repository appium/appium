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

这里之前的文档都已经 deprecated 了。最新的请参见：[The Inspector](https://github.com/appium/appium-desktop#the-inspector)


本文由 [thanksdanny](https://testerhome.com/thanksdanny) 翻译。由 [lihuazhang](https://github.com/lihuazhang) 校验。