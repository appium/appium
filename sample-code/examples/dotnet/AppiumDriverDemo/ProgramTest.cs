using NUnit.Framework;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Text.RegularExpressions;
using OpenQA.Selenium.Remote;
using OpenQA.Selenium.Appium;

namespace AppiumDriverDemo
{
	[TestFixture ()]
	public class ProgramTest
	{
		private AppiumDriver driver;

		[TestFixtureSetUp]
		public void beforeAll(){
			// find the test application
			Console.WriteLine("Finding Test App");
			string appPath = _GetTestAppPath();
			Console.WriteLine("Using Test App @ \"" + appPath + "\"");

			// set up the remote web driver
			Console.WriteLine("Connecting to Appium server");
			DesiredCapabilities capabilities = new DesiredCapabilities();

			capabilities.SetCapability("device", "iPhone Simulator");
			capabilities.SetCapability("deviceName", "iPhone Retina (4-inch 64-bit)");
			capabilities.SetCapability("platform", "ios");
			capabilities.SetCapability("version", "7.1");
			capabilities.SetCapability("app", appPath);
			driver = new AppiumDriver(new Uri("http://127.0.0.1:4723/wd/hub"), capabilities);		
		}

		[TestFixtureTearDown]
		public void afterAll(){
			// shutdown
			driver.Quit();
		}

		[Test ()]
		public void RegularWebdriverMethodsTestCase ()
		{
			// enter random numbers in all text fields
			Console.WriteLine("Entering addends");
			List<int> addends = new List<int>();
			Random randomNumberGenerator = new Random();
			var elements = driver.FindElementsByTagName("textField");
			foreach(var element in elements)
			{
				int randomNumber = randomNumberGenerator.Next(0,10);
				element.SendKeys(randomNumber.ToString());
				addends.Add(randomNumber);
			}

			// calculate the expected result
			int expectedResult = 0;
			foreach(int i in addends)
				expectedResult += i;

			Console.WriteLine("Submitting the form");
			// submit for computation
			var buttons = driver.FindElementsByTagName("button");
			buttons[0].Click();

			// validate the computation
			var staticTexts = driver.FindElementsByTagName("staticText");
			int actualResult = int.Parse(staticTexts[0].Text);
			Assert.AreEqual (actualResult.ToString(), expectedResult.ToString());
		}

		[Test ()]
		public void AppiumDriverMethodsTestCase ()
		{
			// Using appium extension methods
			AppiumWebElement el = (AppiumWebElement) driver.FindElementByIosUIAutomation(".elements()");
			el.SetImmediateValue ("abc");
			Assert.False (driver.IsAppInstalled("RamdomApp"));
		}
		/// <summary>retrieves the path of the locally installed app</summary>
		/// <returns>the path to the Test App</returns>
		private static string _GetTestAppPath()
		{
			string appiumDir = Regex.Replace(System.Reflection.Assembly.GetExecutingAssembly().Location, "/appium/.*$", "/appium");
			return appiumDir + "/sample-code/apps/TestApp/build/Release-iphonesimulator/TestApp.app";
		}

	}

}

