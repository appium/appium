---
hide:
  - toc

title: Write a Test (.NET)
---

The [Appium .NET Client](https://github.com/appium/dotnet-client/) is
an official Appium client in C#. This driver is an extension of the Selenium C# client. It has all the functionalities of the regular driver, but add Appium-specific methods on top of this. The driver is available on the public NuGet Gallery as [Appium.WebDriver](https://www.nuget.org/packages/Appium.WebDriver/).

Now, we get inside the directory and create a new [NUnit](https://nunit.org/) project. We will also add the references to the Appium.Net driver, and other dependencies.

```bash
cd dotnet-client
dotnet new nunit --name appiumtest 

cd appiumtest

# This will install the latest 5.x version
dotnet add package Appium.WebDriver  --prerelease
dotnet add package Newtonsoft.Json --version 13.0.3
```

Once this is done, your project should have a placeholder file `UnitTest1.cs`. We will replace the code to include the OpenQA namespaces, an initialization of the driver, and the actual test.

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
    public void TestBattery()
    {
        _driver.StartActivity("com.android.settings", ".Settings");
        _driver.FindElement(By.XPath("//*[@text='Battery']")).Click();
    }
}
```

!!! note

    It's not within the scope of this guide to give a complete run-down on the dotnet client
    library or everything that's happening here, so we'll leave the code itself unexplained in
    detail for now. You may want to read up particularly on Appium
    [Capabilities](../guides/caps.md) in addition to familiarizing yourself with the 
    [dotnet client driver documentation](https://github.com/appium/dotnet-client/) for a fuller explanation
    of the various API commands you see and what their purpose is.

Basically, this code is doing the following:

1. Defining a set of "Capabilities" (parameters) to send to the Appium server so Appium knows what
kind of thing you want to automate. Some of these parameters can be overriden using environment variables.
1. Starting an Appium session on the built-in Android settings app.
1. Finding the "Battery" list item and clicking it.
1. Ending the Appium session.

That's it! Let's give it a try. Before you run the test, make sure that you have an Appium server
running in another terminal session, otherwise you'll get an error about not being able to connect
to one. Then, you can execute the script:

```bash
dotnet test

# Example output:
# Starting test execution, please wait...
# A total of 1 test files matched the specified pattern.

# Passed!  - Failed:     0, Passed:     1, Skipped:     0, Total:     1, Duration: 323 ms - appiumtest.dll (net7.0)
```

If all goes well, you'll see the Settings app open up and navigate to the "Battery" view in the emulator before the app closes again.

Congratulations, you've started your Appium journey! Read on for some [next steps](./next-steps.md) to explore.
