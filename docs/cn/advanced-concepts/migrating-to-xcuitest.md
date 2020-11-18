## 将你的iOS测试从UIAutomation（iOS 9.3及更低版本）迁移到XCUITest（iOS 9.3及更高版本）

对于 iOS 自动化，Appium 依赖苹果提供的系统框架。对于 iOS 9.2 及更低版本，苹果唯一的自动化技术被称为UIAutomation，它运行在 “Instruments” 中。从 iOS 10 开始，苹果已经完全删除了 UIAutomation 工具，因此 Appium 不可能按照以前的方式进行测试。同时，苹果推出了一款名为 XCUITest 的新型自动化技术，从 iOS 9.3 到 iOS 10 及以上版本，这将是苹果唯一支持的自动化框架。

Appium 从 Appium 1.6 开始支持 XCUITest。在大多数情况下，XCUITest 的功能与 UIAutomation 的功能相匹配，因此，Appium 团队能够确保测试行为保持不变。这是使用 Appium 的好处之一！即使苹果完全改变了测试使用的技术，你的脚本可以保持大致相同！话虽如此，如果您想在 XCUITest 运行它们，还是存在些许差异，您需要关注测试脚本中需要修改的部分。本文将帮助您解决这些差异。

### 元素类名称模式

在 XCUITest 中，苹果已经为构成视图层次结构的 UI 元素提供了不同的类名。例如，`UIAButton` 现在为`XCUIElementTypeButton`。在很多情况下，这两个类之间有直接映射。如果您使用 `class name` 定位器策略来查找元素，Appium 1.6 将为您重写选择器。同样，如果你使用xpath定位器策略，Appium 1.6 将在 XPath 字符串中找到所有 `UIA*` 元素，并适当地重写它们。

但是，这并不能保证你的测试可以完全相同地运行，原因有两个：

1. Appium 通过 XCUITest 和 UIAutomation 看到的应用的层次结构不一定是相同的。如果你有基于路径的 XPath 选择器，则可能需要进行调整。

2. 类名列表也不完全一样。许多由 XCUITest 返回的元素属于`XCUIElementTypeOther类`，这是一种全新的容器。

### 页面源码

如上述，如果你依赖 `page source` 命令返回的 app 源 XML，那么这个输出的 XML 会与基于 UIAutomation 的结果会有显著不同。

### `-ios uiautomation` 定位策略

此定位器策略专门用于 UIAutomation，因此它不包括在 XCUITest 中。 在即将发布的版本中，我们将致力于类似的 “native” 型定位策略。

### `xpath` 定位策略

1. 尽量不要使用 XPath 定位器，除非你完全没有其他选择。 通常，xpath 定位器可能比其他类型的定位器慢，比如accessibility id，类名和谓词（在某些特殊情况下可减缓100倍）。 它们太慢了，因为 xpath 的位置不是苹果的XCTest 框架本身所支持的。

2. 使用

```
driver.findElement(x)
```

而不是使用

```
driver.findElements(x)[0]
```

通过xpath查找单个元素。 您的定位器匹配的UI元素越多，你的脚本越慢。

3. 在通过 xpath 定位元素时，一定要使用非常具体的xpath。 像这样的定位器

```
//*
```

可能需要几分钟才能完成，具体取决于您的应用程序有多少用户界面元素（例如，

```
driver.findElement(By.xpath("//XCUIElementTypeButton[@value='blabla']"))
```

比

```
driver.findElement(By.xpath("//*[@value='blabla']"))
```

或

```
driver.findElement(By.xpath("//XCUIElementTypeButton")))
```

要快很多。

4. 在大多数情况下，执行多个嵌套的 findElement 调用比执行 xpath 单个调用更快（例如，

```
driver.findElement(x).findElement(y)
```
通常比

```
driver.findElement(z)
```

要快

其中x和y不是xpath定位符，z是xpath定位符）。

### 系统依赖

除了升级 XCode 会带来（与Appium无关）许多问题之外，Appium 对 XCUITest 的支持还需要一个新的系统依赖：[Carthage](https://github.com/Carthage/Carthage)。Appium Doctor 现已更新，以确保`carthage`二进制在你的系统路径里。

### API差异

Unfortunately, the XCUITest API and the UIAutomation API are not equivalent. In many cases (like with `tap/click`), the behavior is identical. But some features that were available in the UIAutomation backend are not yet available in the new XCUITest backend. These known lacking features include:

不幸的是，XCUITest API 和 UIAutomation API 还是有差别的。在许多情况下（比如 tap/click），行为是相同的，但在 UIAutomation 作为底层驱动时，可用的某些功能在新的 XCUITest 时尚不可用。下面是已知的缺乏的功能：

* 地理位置支持（例如： `driver.location`）
* 振动设备
* 锁定设备
* 旋转设备（device _orientation_ 是支持的）


We will endeavor to add these features back in future releases of Appium.

我们在努力把这些功能加到 Appium 的未来版本里。

#### 滚动和点击

在之前基于 UIAutomation 的驱动中，如果您尝试单击不在视图中的元素，UIAutomation 将自动滚动到该元素，然后点击它。 使用 XCUITest，不是这样。 点击之前，你需要确保元素可见（与用户看到才能点击的行为一致）。

### 其他已知问题

Finally, a list of known issues with the initial 1.6 release (we'll strike through issues which have been resolved):

最后，列出了初始 1.6 版本的已知问题（已解决的问题会被横线划去）：

* <del>无法以横向模式与设备上的元素进行交互（https://github.com/appium/appium/issues/6994)</del>
* `shake` 苹果不支持所以我们没有实现
* `lock` 苹果不支持所以我们没有实现
* 设置地理位置不被苹果支持，我们也不支持
* 通过TouchAction / MultiAction API，`zoom` 手势支持，因为苹果的一个bug，`pinch` 手势不支持。
* <del>通过TouchAction / MultiAction API，`swipe`手势目前不受支持，应该很快解决（https://github.com/appium/appium/issues/7573）</del>
* `autoAcceptAlerts`， `autoDismissAlerts`目前还不能工作，而且我们是否能够在将来实施这些，存在争议。
* iOS SDK 有一个问题，因此使用某些 API 方法构建的 PickerWheels 不能由 XCUITest 自动执行。有关解决方法，请参阅https://github.com/appium/appium/issues/6962，以确保您的 PickerWheels 正确构建。

我们将尽可能添加缺失的功能，并在以后的 Appium 版本中修复其他已知问题。


本文由 校长 翻译，由 lihuazhang 校验。
