## The Windows Driver

Appium has the ability to automate Windows PC Desktop apps. This driver relies
on a project from Microsoft called
[WinAppDriver](https://github.com/Microsoft/WinAppDriver), which is an
Appium-compatible WebDriver server for Windows Desktop apps (and more in the
future). WinAppDriver is often abbreviated "WAD". WAD is bundled with Appium
and does not need to be installed separately.

The Windows Driver supports testing of **Universal Windows Platform (UWP)** and
**Classic Windows (Win32)** applications.

In addition to the WAD repo, development of the Appium driver takes place at
the [appium-windows-driver](https://github.com/appium/appium-windows-driver)
repo.

### Requirements and Support

In addition to Appium's general requirements:

* Windows PC with Windows 10 or up
* Ability to enter Administrator mode

### Usage

The way to start a session using the Windows driver is to include the
`platformName` [capability](#TODO) in your [new session request](#TODO), with
the value `Windows`. Also, ensure that you set the `deviceName` capability to
`WindowsPC` as well.  Of course, you must also include an appropriate `app`
capability, at a minimum (see below).

### Capabilities

The Windows driver supports a number of standard [Appium
capabilities](/docs/en/writing-running-appium/caps.md). See below for how these
should be used specifically with the Windows driver.

### Setup

To test a Windows app, simply make sure you have turned [developer
mode](https://msdn.microsoft.com/en-us/windows/uwp/get-started/enable-your-device-for-development)
on.

When running Appium (whether Appium Desktop or from the command line), ensure
that you have started the app / cmd prompt as an administrator.

### Writing Tests for the Windows Driver

You could begin by taking a look at some existing samples:

**Java Samples**<br/>
1. Open the sample folder as an existing project in a Java IDE such as
   IntelliJ. For example:
   [CalculatorTest](https://github.com/Microsoft/WinAppDriver/tree/master/Samples/Java/CalculatorTest)
2. In the Java IDE build and run the test

**C# Samples**<br/>
1. Pull and open `CalculatorTest.sln` under
   [CalculatorTest](https://github.com/Microsoft/WinAppDriver/tree/master/Samples/C%23/CalculatorTest)
2. In Visual Studio 2015 with the test solution open build the test and select
   **Test > Run > All Tests**

**Javascript/node Samples**

1. Using selenium-webdriver

    [Examples on selenium-appium](https://github.com/react-native-windows/selenium-appium/tree/master/example)

    [selenium-webdriver-winappdriver-example](https://github.com/react-native-windows/selenium-webdriver-winappdriver-example)


If you want to write tests from scratch, you can choose any programming
language or tools supported by Appium/Selenium to write your test scripts. In
the example below, we will author the test script in C# using Microsoft Visual
Studio 2015.

#### Create Test Project

1. Open **Microsoft Visual Studio 2015**
2. Create the test project and solution. I.e. select **New Project > Templates
   > Visual C# > Test > Unit Test Project**
3. Once created, select **Project > Manage NuGet Packages... > Browse** and
   search for **Appium.WebDriver**
4. Install the **Appium.WebDriver** NuGet packages for the test project
5. Start writing your test (see sample code under [samples])

#### Universal Windows Platform App Testing

To test a UWP app, you can use any Selenium supported language and simply
specify the **Application Id** for the app under test in the **app**
capabilities entry. Below is an example of creating a test session for Windows
**Alarms & Clock** app written in C#:

```c#
// Launch the AlarmClock app
DesiredCapabilities appCapabilities = new DesiredCapabilities();
appCapabilities.SetCapability("app", "Microsoft.WindowsAlarms_8wekyb3d8bbwe!App");
AlarmClockSession = new WindowsDriver<WindowsElement>(new Uri("http://127.0.0.1:4723"), appCapabilities);
// Control the AlarmClock app
AlarmClockSession.FindElementByAccessibilityId("AddAlarmButton").Click();
AlarmClockSession.FindElementByAccessibilityId("AlarmNameTextBox").Clear();
```

When testing the application you authored yourself, you can find the **Application Id** in the generetated `AppX\vs.appxrecipe` file under `RegisteredUserNmodeAppID` node. E.g. ```c24c8163-548e-4b84-a466-530178fc0580_scyf5npe3hv32!App```

#### Classic Windows App Testing

To test a classic Windows app, you can also use any Selenium supported language
and specify the **full executable path** for the app under test in the **app**
capabilities entry. Below is an example of creating a test session for Windows
**Notepad** app:

```c#
// Launch Notepad
DesiredCapabilities appCapabilities = new DesiredCapabilities();
appCapabilities.SetCapability("app", @"C:\Windows\System32\notepad.exe");
NotepadSession = new WindowsDriver<WindowsElement>(new Uri("http://127.0.0.1:4723"), appCapabilities);
// Control the AlarmClock app
NotepadSession.FindElementByClassName("Edit").SendKeys("This is some text");
```

#### Starting a Session

As mentioned above, you should additionally use these capabilities to ensure
you are getting a Windows App automation session:

`platformName`: `Windows`
`deviceName`: `WindowsPC`
`app`: the appID of the Windows app for testing, or the path to the .exe file

#### Inspecting UI Elements

Microsoft Visual Studio 2015 by default includes Windows SDK that provides
great tool to inspect the application you are testing. This tool allows you to
see every UI element/node that you can query using Windows Application Driver.
This **inspect.exe** tool can be found under the Windows SDK folder such as
`C:\Program Files (x86)\Windows Kits\10\bin\x86`. The tool will show various
element attributes. The table below shows you witch Appium locator strategy you
should use to find elements with the corresponding attributes.

| Locator Strategy| Matched Attribute|
|-----------------|------------------|
| accessibility id|   AutomationId   |
|    class name   |     ClassName    |
|       name      |       Name       |
