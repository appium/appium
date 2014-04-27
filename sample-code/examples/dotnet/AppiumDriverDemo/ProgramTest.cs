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

			capabilities.SetCapability("deviceName", "iPhone Retina (4-inch 64-bit)");
			capabilities.SetCapability("platformName", "iOS");
			capabilities.SetCapability("platformVersion", "7.1");
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
		
			var element = driver.FindElementByIosUIAutomation(".textFields()[\"TextField1\"];");
			int randomNumber = randomNumberGenerator.Next(0,10);
			element.SendKeys(randomNumber.ToString());
			addends.Add(randomNumber);

			element = driver.FindElementByIosUIAutomation(".textFields()[\"TextField2\"];");
			randomNumber = randomNumberGenerator.Next(0,10);
			element.SendKeys(randomNumber.ToString());
			addends.Add(randomNumber);

			// calculate the expected result
			int expectedResult = 0;
			foreach(int i in addends)
				expectedResult += i;

			Console.WriteLine("Submitting the form");
			// submit for computation
			var button = driver.FindElementByIosUIAutomation(".buttons()[\"ComputeSumButton\"]");
			button.Click();

			// TODO check the result
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

