using NUnit.Framework;
using System;
using Appium.Samples.Helpers;
using OpenQA.Selenium.Appium;
using OpenQA.Selenium.Remote;
using System.Collections.Generic;
using OpenQA.Selenium;
using System.Threading;
using System.Drawing;
using OpenQA.Selenium.Appium.Interfaces;
using OpenQA.Selenium.Appium.MultiTouch;

namespace Appium.Samples
{
	[TestFixture ()]
	public class IosWebviewTest
	{
		private AppiumDriver driver;
		private bool allPassed = true;

		[TestFixtureSetUp]
		public void BeforeAll(){
			DesiredCapabilities capabilities = Caps.getIos71Caps (Apps.get("iosWebviewApp")); 
			if (Env.isSauce ()) {
				capabilities.SetCapability("username", Env.getEnvVar("SAUCE_USERNAME")); 
				capabilities.SetCapability("accessKey", Env.getEnvVar("SAUCE_ACCESS_KEY"));
				capabilities.SetCapability("name", "ios - webview");
				capabilities.SetCapability("tags", new string[]{"sample"});
			}
			Uri serverUri = Env.isSauce () ? AppiumServers.sauceURI : AppiumServers.localURI;
			driver = new AppiumDriver(serverUri, capabilities, Env.INIT_TIMEOUT_SEC);	
			driver.Manage().Timeouts().ImplicitlyWait(Env.IMPLICIT_TIMEOUT_SEC);
		}

		[TestFixtureTearDown]
		public void AfterAll(){
			try
			{
				if(Env.isSauce())
					((IJavaScriptExecutor)driver).ExecuteScript("sauce:job-result=" + (allPassed ? "passed" : "failed"));
			}
			finally
			{
				driver.Quit();
			}
		}

		[TearDown]
		public void AfterEach(){
			allPassed = allPassed && (TestContext.CurrentContext.Result.State == TestState.Success);
		}

		[Test ()]
		public void GetPageTestCase ()
		{
			driver.FindElementByXPath("//UIATextField[@value='Enter URL']")
				.SendKeys("https://www.google.com");
			driver.FindElementByName ("Go").Click ();
			driver.FindElementByClassName ("UIAWebView").Click (); // dismissing keyboard
			driver.SetContext ("WEBVIEW");
			Thread.Sleep (3000);
			var el = driver.FindElementByName ("q");
			el.SendKeys ("sauce labs");
			el.SendKeys(Keys.Return);
			Thread.Sleep (1000);
			Assert.IsTrue (driver.Title.Contains("sauce labs"));
		}
	}
}
