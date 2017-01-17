#Windows Application UI Testing
Windows specific UI testing on Appium is powered by [WinAppDriver] (https://github.com/Microsoft/WinAppDriver), which is downloaded as part of the Appium install.

## Java Samples
1. Open the sample folder as an existing project in a Java IDE such as IntelliJ. For example: [CalculatorTest](https://github.com/Microsoft/WinAppDriver/tree/master/Samples/Java/CalculatorTest)
2. In the Java IDE build and run the test

## C# Samples
1. Pull and open `CalculatorTest.sln` under [CalculatorTest](https://github.com/Microsoft/WinAppDriver/tree/master/Samples/C%23/CalculatorTest)
2. In Visual Studio 2015 with the test solution open build the test and select **Test > Run > All Tests**

## Features
Windows Application Driver supports testing **Universal Windows Platform (UWP)** and **Classic Windows (Win32)** apps on **Windows 10 PC**

## Creating Your Own Test Script
You can choose any programming language or tools supported by Appium/Selenium to write your test scripts. In the example below, we will author the test script in C# using Microsoft Visual Studio 2015.
### Create Test Project
1. Open **Microsoft Visual Studio 2015**
2. Create the test project and solution. I.e. select **New Project > Templates > Visual C# > Test > Unit Test Project**
3. Once created, select **Project > Manage NuGet Packages... > Browse** and search for **Appium.WebDriver**
4. Install the **Appium.WebDriver** NuGet packages for the test project
5. Start writing your test (see sample code under [samples])
### Universal Windows Platform App Testing
To test a UWP app, you can use any Selenium supported language and simply specify the **Application Id** for the app under test in the **app** capabilities entry. Below is an example of creating a test session for Windows **Alarms & Clock** app written in C#:
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
### Classic Windows App Testing
To test a classic Windows app, you can also use any Selenium supported language and specify the **full executable path** for the app under test in the **app** capabilities entry. Below is an example of creating a test session for Windows **Notepad** app:
```c#
// Launch Notepad
DesiredCapabilities appCapabilities = new DesiredCapabilities();
appCapabilities.SetCapability("app", @"C:\Windows\System32\notepad.exe");
NotepadSession = new WindowsDriver<WindowsElement>(new Uri("http://127.0.0.1:4723"), appCapabilities);
// Control the AlarmClock app
NotepadSession.FindElementByClassName("Edit").SendKeys("This is some text");
```

### Starting a Session
Note that you should additionally use these capabilities to ensure you are getting a Windows App automation session:

`platformName`: `Windows`
`deviceName`: `WindowsPC`

### Inspecting UI Elements
Microsoft Visual Studio 2015 by default includes Windows SDK that provides great tool to inspect the application you are testing. This tool allows you to see every UI element/node that you can query using Windows Application Driver. This **inspect.exe** tool can be found under the Windows SDK folder such as `C:\Program Files (x86)\Windows Kits\10\bin\x86`

| Locator Strategy	| Matched Attribute	|
|------------------|-------------------|
| accessibility id	|   AutomationId   	|
|    class name   	|     ClassName    	|
|       name      	|       Name       	|
