# UIAutomator 2

尽管API大部分依然相同，内部实现已经改变了。我们来看UIObject2的介绍：

### UIObject2

不同于UiObject，UIElement被绑定到一个特殊的view实例上，并且可能在底层view对象被销毁后变得陈旧。因此，如果UI发生的显著的变化，可能就必须去调用findObject(BySelector)以获得一个新的UiObject2实例。

### 构建系统

UIAutomator 2利用了Gradle作为构建系统的能力。之前的UIAutomator使用Maven/Ant。

### 测试产出(Assets)

现在生成的测试包是APK。之前UIAutomator生成.jar或.zip文件。这让UIAutomator 2完整地有了Android instrumentation能力。

### ADB

ADB对UIAutomator 2的处理有轻微的不同。

最初版本的UiAutomator作为一个shell程序运行：

```adb shell uiautomator runtest ...```

UiAutomator 2是基于Android Instrumentation的。测试被编译进APK里，并且在应用进程里运行：

```adb shell am instrument ...```
