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
	public class IosLocalServerTest
	{
		private AppiumDriver driver;
		private bool allPassed = true;
		LocalServer server = new LocalServer (3000);

		[TestFixtureSetUp]
		public void BeforeAll(){
			server.Start ();
			DesiredCapabilities capabilities = Caps.getIos71Caps (Apps.get("iosWebviewAppLocal")); 
			if (Env.isSauce ()) {
				capabilities.SetCapability("username", Env.getEnvVar("SAUCE_USERNAME")); 
				capabilities.SetCapability("accessKey", Env.getEnvVar("SAUCE_ACCESS_KEY"));
				capabilities.SetCapability("name", "ios - local server");
				capabilities.SetCapability("tags", new string[]{"sample"});
			}
			Uri serverUri = Env.isSauce () ? AppiumServers.sauceURI : AppiumServers.localURI;
			driver = new AppiumDriver(serverUri, capabilities, Env.INIT_TIMEOUT_SEC);	
			driver.Manage().Timeouts().ImplicitlyWait(Env.IMPLICIT_TIMEOUT_SEC);
		}

		[TestFixtureTearDown]
		public void AfterAll(){
			server.Stop ();
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
				.SendKeys("http://localhost:3000/index.html");
			driver.FindElementByName ("Go").Click ();
			driver.FindElementByClassName ("UIAWebView").Click (); // dismissing keyboard
			Thread.Sleep (3000);
			driver.SetContext ("WEBVIEW");
			Thread.Sleep (1000);
			var wowEl = driver.FindElementById ("wow");
			Assert.IsTrue (wowEl.Text.Contains("so cool"));
		}
	}
}
