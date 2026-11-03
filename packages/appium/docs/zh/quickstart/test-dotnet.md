---
hide:
  - toc

title: 编写测试 (.NET)
---

[Appium .NET Client](https://github.com/appium/dotnet-client/) 是
官方的 Appium C# 客户端。 这个驱动程序是 Selenium C# 客户端的扩展。 它具有常规驱动程序的所有功能，但在之上添加了 Appium 特定的方法。 该驱动程序在公共 NuGet Gallery 上作为 [Appium.WebDriver](https://www.nuget.org/packages/Appium.WebDriver/) 提供。

现在，我们进入目录并创建一个新的 [NUnit](https://nunit.org/) 项目。 我们还将添加对 Appium.Net 驱动程序和其他依赖项的引用。

```bash
cd dotnet-client
dotnet new nunit --name appiumtest

cd appiumtest

# 这将安装最新的 5.x 版本
dotnet add package Appium.WebDriver  --prerelease
dotnet add package Newtonsoft.Json --version 13.0.3
```

完成后，您的项目应该有一个占位符文件 `UnitTest1.cs`。 我们将替换代码以包含 OpenQA 命名空间、驱动程序的初始化以及实际测试。

```C# title="UnitTest1.cs"
using OpenQA.Selenium;
using OpenQA.Selenium.Appium;
using OpenQA.Selenium.Appium.Android;
using OpenQA.Selenium.Appium.Enums;

namespace appiumtest;

public class Tests
{
    private AndroidDriver _driver;

    [OneTimeSetUp]
    public void SetUp()
    {
        var serverUri = new Uri(Environment.GetEnvironmentVariable("APPIUM_HOST") ?? "http://127.0.0.1:4723/");
        var driverOptions = new AppiumOptions() {
            AutomationName = AutomationName.AndroidUIAutomator2,
            PlatformName = "Android",
            DeviceName = "Android Emulator",
        };

        driverOptions.AddAdditionalAppiumOption("appPackage", "com.android.settings");
        driverOptions.AddAdditionalAppiumOption("appActivity", ".Settings");
        // NoReset assumes the app com.google.android is preinstalled on the emulator
        driverOptions.AddAdditionalAppiumOption("noReset", true);

        _driver = new AndroidDriver(serverUri, driverOptions, TimeSpan.FromSeconds(180));
        _driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(10);
    }

    [OneTimeTearDown]
    public void TearDown()
    {
        _driver.Dispose();
    }

    [Test]
    public void TestFindApps()
    {
        _driver.StartActivity("com.android.settings", ".Settings");
        _driver.FindElement(By.XPath("//*[@text='Apps']")).Click();
    }
}
```

!!! 备注

```
这份指南的范围不包括对 dotnet 客户端库或此处发生的一切进行完整说明，因此我们暂时不对代码本身进行详细解释。您可能需要特别阅读 Appium [Capabilities](../guides/caps.md)，以及熟悉 [dotnet 客户端驱动程序文档](https://github.com/appium/dotnet-client/) 以获得对您看到的各种 API 命令及其目的的更全面解释。
```

基本上，此代码执行以下操作：

1. 定义一组"Capabilities"（参数）发送到 Appium 服务器，以便 Appium 知道您想要自动化什么。 有些参数可以使用环境变量覆盖。
2. 在内置的 Android 设置应用上启动 Appium 会话。
3. 查找"Apps"列表项并点击它。
4. 结束 Appium 会话。

就是这样！ 让我们试试。 在运行测试之前，请确保在另一个终端会话中运行 Appium 服务器，否则您会收到无法连接的错误。 然后，您可以执行脚本：

```bash
dotnet test

# 示例输出：
# Starting test execution, please wait...
# A total of 1 test files matched the specified pattern.

# Passed!  - Failed:     0, Passed:     1, Skipped:     0, Total:     1, Duration: 323 ms - appiumtest.dll (net7.0)
```

如果一切顺利，您将看到设置应用打开并在模拟器中导航到"Apps"视图，然后应用再次关闭。

恭喜，您已经开始了 Appium 之旅！ 继续阅读一些 [后续步骤](./next-steps.md) 以进行探索。
