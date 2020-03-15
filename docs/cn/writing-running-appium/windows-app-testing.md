# Windows 应用的 UI 测试

在 Appium 中，Windows 应用的 UI 测试是由 [WinAppDriver](https://github.com/Microsoft/WinAppDriver) 支持的，Appium 在下载安装的时候已经带了这部分。

## Java 示例
1. 在 Java IDE （比如 IntelliJ）中打开包含示例项目工程的目录，如：[CalculatorTest](https://github.com/Microsoft/WinAppDriver/tree/master/Samples/Java/CalculatorTest)
2. 在 Java IDE 中 build 并运行这个测试脚本

## C# 示例
1. 拉取并打开 [CalculatorTest](https://github.com/Microsoft/WinAppDriver/tree/master/Samples/C%23/CalculatorTest) 目录下的文件 `CalculatorTest.sln`
2. 在 Visual Studio 2015 中打开 test solution，然后 build 这个测试脚本并选择 **Test > Run > All Tests**

## 特性
Windows Application Driver 支持测试 **Windows 10 PC** 上的**Universal Windows Platform (UWP)** 及 **Classic Windows (Win32)** 应用。

## 创建你的测试脚本
你可以使用任意一个 Appium 或 Selenium 支持的编程语言来编写测试脚本，在下面的例子中，我们会使用 C# 在 **Microsoft Visual Studio 2015** 编写测试脚本。

## 创建测试项目工程
1. 打开 **Microsoft Visual Studio 2015**
2. 创建 test project 和 solution。选择 **New Project > Templates > Visual C# > Test > Unit Test Project**
3. 创建好之后，打开 **Project > Manage NuGet Packages... > Browse** ，并搜索 **Appium.WebDriver**
4. 为当前的 test project 安装 **Appium.WebDriver**
5. 接下来就可以编写测试脚本了（可参考 [samples](https://github.com/appium/sample-code/tree/master/sample-code/examples/C%23/CalculatorTest) 目录下的示例代码）。

## Universal Windows Platform 应用的测试
你可以使用 Selenium 支持的编程语言来编写脚本来测试 UWP 应用，通过 **app capabilities entry**，可以对测试的 app 找到它的 **Application Id**。下面是一个用 C# 编写的例子，主要是为 Windows 上的 **Alarms & Clock app** 创建一个测试 session：

```c#
// Launch the AlarmClock app
DesiredCapabilities appCapabilities = new DesiredCapabilities();
appCapabilities.SetCapability("app", "Microsoft.WindowsAlarms_8wekyb3d8bbwe!App");
AlarmClockSession = new IOSDriver<IOSElement>(new Uri("http://127.0.0.1:4723"), appCapabilities);
// Control the AlarmClock app
AlarmClockSession.FindElementByAccessibilityId("AddAlarmButton").Click();
AlarmClockSession.FindElementByAccessibilityId("AlarmNameTextBox").Clear();
```
在测试自己的应用时，你可以在项目工程下生成的文件 `AppX\vs.appxrecipe` 中找到该应用的 **Application id**，如：```c24c8163-548e-4b84-a466-530178fc0580_scyf5npe3hv32!App```，这个文件位于 RegisteredUserNmodeAppID 节点下。

### Classic Windows 应用的测试
同样的，你可以使用任意一门 Selenium 支持的编程语言来编写对 Classic Windows 应用的测试脚本，并在 app capabilities entry 中指定该应用的**绝对路径**。下面的例子是对 Windows 系统下的应用 **Notepad** 创建一个测试 session：

```c#
// Launch Notepad
DesiredCapabilities appCapabilities = new DesiredCapabilities();
appCapabilities.SetCapability("app", @"C:\Windows\System32\notepad.exe");
NotepadSession = new IOSDriver<IOSElement>(new Uri("http://127.0.0.1:4723"), appCapabilities);
// Control the AlarmClock app
NotepadSession.FindElementByClassName("Edit").SendKeys("This is some text");
```

### 启动 Session
注意你需要额外使用下面的这些 capabilities 来确保可以获得 Windows App automation session：

`platformName`: `Windows`
`deviceName`: `WindowsPC`

### 定位 UI 元素
**Microsoft Visual Studio 2015** 已经默认包含了 Windows SDK，这些 SDK 提供了足够好的用于对你测试的应用进行分析的工具。这类工具能够让你利用 Windows Application Driver 来查看那些你可以找到的 UI 元素或节点。你可以在 Windows SDK 目录（如`C:\Program Files (x86)\Windows Kits\10\bin\x86`）下找到 **inspect.exe** 这个工具。

|       定位方法   	|       匹配属性    	|
|------------------|-------------------|
| accessibility id	|   AutomationId   	|
|    class name   	|     ClassName    	|
|       name      	|       Name       	|

本文由 fishky2 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。
