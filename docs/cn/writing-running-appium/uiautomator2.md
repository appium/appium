# UIAutomator 2

尽管 API 大部分依然相同，但是内部实现已经改变了。我们来看 UIObject2 的介绍：

### UIObject2

不同于 UiObject，UIElement 被绑定到一个特殊的 view 实例上，并且在底层 view 对象被销毁后变成过期的。因此，如果 UI 发生的显著变化时，可能就必须去调用 findObject(BySelector) 以获得一个新的 UiObject2 实例。

### 构建系统

UIAutomator 2利用了Gradle作为构建系统的能力。之前的UIAutomator使用Maven/Ant。

### 测试产出(Assets)

现在生成的测试包是APK。之前UIAutomator生成.jar或.zip文件。这让 UIAutomator 2 能完整地使用 Android instrumentation 的能力。

### ADB

ADB 对 UIAutomator 2 的处理有轻微的不同。

老版本的 UiAutomator 作为一个 shell 程序运行：

```adb shell uiautomator runtest ...```

UiAutomator 2 是基于 Android Instrumentation 的。测试被编译进APK里，并且在应用进程里运行：

```adb shell am instrument ...```

本文由 [NativeZhang](https://github.com/NativeZhang) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。