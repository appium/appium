---
hide:
  - toc

title: 编写一个测试(.NET)
---

[Appium.NET 客户端](https://github.com/appium/dotnet-client/)是 C# 中的官方 Appium 客户端。
此驱动程序是 Selenium C# 客户端的扩展。它具有常规驱动程序的所有功能，并在此基础上添加了Appium特定的方法。
该驱动程序可在 NuGet Gallery 上以[Appium.WebDriver](https://www.nuget.org/packages/Appium.WebDriver/)的形式提供。

现在，我们进入该目录并创建一个新的[NUnit](https://nunit.org/)项目。我们还将添加对 Appium.NET 驱动程序的引用和其他依赖项。

```bash
cd dotnet-client
dotnet new nunit --name appiumtest 

cd appiumtest

# 这将安装最新的5.x版本
dotnet add package Appium.WebDriver  --prerelease
dotnet add package Newtonsoft.Json --version 13.0.3
```

完成此操作后，您的项目应该有一个占位符文件`UnitTest1.cs`。我们将替换代码，以包含OpenQA名称空间、驱动程序的初始化和实际测试。

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
        // NoReset假设模拟器上预装了com.google.android应用程序
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
    public void TestBattery()
    {
        _driver.StartActivity("com.android.settings", ".Settings");
        _driver.FindElement(By.XPath("//*[@text='Battery']")).Click();
    }
}
```

!!! 注意

    本指南不包括对.NET客户端库或这里发生的一切进行完整的概述，因此我们暂时不详细解释代码本身。
    除了熟悉[dotnet客户端驱动程序文档](https://github.com/appium/dotnet-client/)外，
    您可能还想阅读[Appium功能](../guides/caps.md)文档，以更全面地解释您看到的各种API命令及其用途。

基本上，这段代码正在执行以下操作：

1. 定义一组要发送到Appium服务器的“能力”（参数），以便Appium知道您想要自动化什么。其中一些参数可以使用环境变量覆盖。
1. 在内置的Android设置应用程序上启动Appium会话。
1. 找到“电池”列表项并单击它。
1. 结束Appium会话。

就是这样！让我们试试。在运行测试之前，请确保您在另一个终端会话中运行了 Appium 服务器，否则您将收到无法连接到该服务器的错误。然后，您可以执行脚本：

```bash
dotnet test

# 示例输出：
# Starting test execution, please wait...
# A total of 1 test files matched the specified pattern.

# Passed!  - Failed:     0, Passed:     1, Skipped:     0, Total:     1, Duration: 323 ms - appiumtest.dll (net7.0)
```

如果一切顺利，您会看到“设置”应用程序打开，并导航到模拟器中的“电池”视图，然后应用程序关闭。

恭喜，您已经开始了您的Appium之旅！请继续阅读，了解[下一步](./next-steps.md)要探索的内容。
