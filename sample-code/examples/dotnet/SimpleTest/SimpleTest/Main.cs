using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using OpenQA.Selenium.Remote;

namespace SimpleTest
{
	class MainClass
	{
		public static void Main (string[] args)
		{
			// find the test application
			Console.WriteLine("Finding Test App");
			string appPath = _GetTestAppPath();
			Console.WriteLine("Using Test App @ \"" + appPath + "\"");

			// set up the remote web driver
			Console.WriteLine("Connecting to Appium server");
			DesiredCapabilities capabilities = new DesiredCapabilities();
			capabilities.SetCapability("browserName", "iOS");
			capabilities.SetCapability("platform", "Mac");
			capabilities.SetCapability("version", "6.0");
			capabilities.SetCapability("app", appPath);
			RemoteWebDriver driver = new RemoteWebDriver(new Uri("http://127.0.0.1:4723/wd/hub"), capabilities);

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
			bool pass = expectedResult == actualResult;
			_LogWithColor(pass, "EXPECTED: " + expectedResult.ToString() + " ACTUAL: " + actualResult.ToString());

			// shutdown
			driver.Quit();
		}

		/// <summary>uses spotlight to find the path to the compiled test app</summary>
		/// <returns>the path to the Test App</returns>
		private static string _GetTestAppPath()
		{
			ProcessStartInfo appFinderStartInfo = new ProcessStartInfo("/usr/bin/mdfind", "-name \"TestApp.app\"");
			appFinderStartInfo.RedirectStandardOutput = true;
			appFinderStartInfo.UseShellExecute = false;
			Process appFinder = Process.Start(appFinderStartInfo);
			appFinder.WaitForExit();
			string appPath = null;
			foreach(string path in appFinder.StandardOutput.ReadToEnd().Split(new char[] {'\n','\r'}))
			{
				if (!path.Trim().EndsWith(".dSYM") && path.ToLower().Contains("simulator"))
				{
					appPath = path.Trim();
					break;
				}
			}
			return appPath;
		}

		/// <summary>logs statements in green if they pass and red if they fail</summary>
		/// <param name="pass"><c>true<c/c> if the message is related to a test passing, <c>false</c> otherwise</param>
		/// <param name="message">message to log</param>
		private static void _LogWithColor(bool pass, string message)
		{
			var originalColor = Console.ForegroundColor;
			Console.ForegroundColor = pass ? ConsoleColor.Green : ConsoleColor.Red;
			Console.WriteLine(message);
			Console.ForegroundColor = originalColor;
		}
	}
}
