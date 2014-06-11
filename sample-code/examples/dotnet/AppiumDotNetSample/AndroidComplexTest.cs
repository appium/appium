using NUnit.Framework;
using System;
using Appium.Samples.Helpers;
using OpenQA.Selenium.Appium;
using OpenQA.Selenium.Remote;
using System.Collections.Generic;
using OpenQA.Selenium;
using System.Threading;
using System.Drawing;
using System.Collections;
using OpenQA.Selenium.Appium.MultiTouch;
using OpenQA.Selenium.Appium.Interfaces;

namespace Appium.Samples
{
	[TestFixture ()]
	public class AndroidComplexTest
	{
		private AppiumDriver driver;
		private bool allPassed = true;

		[TestFixtureSetUp]
		public void BeforeAll(){
			DesiredCapabilities capabilities = Env.isSauce () ? 
				Caps.getAndroid18Caps (Apps.get ("androidApiDemos")) :
				Caps.getAndroid19Caps (Apps.get ("androidApiDemos"));
			if (Env.isSauce ()) {
				capabilities.SetCapability("username", Env.getEnvVar("SAUCE_USERNAME")); 
				capabilities.SetCapability("accessKey", Env.getEnvVar("SAUCE_ACCESS_KEY"));
				capabilities.SetCapability("name", "android - complex");
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
		public void FindElementTestCase ()
		{
			driver.FindElementByXPath ("//android.widget.TextView[@text='Animation']");
			Assert.AreEqual( driver.FindElementByXPath ("//android.widget.TextView").Text,
				"API Demos");
			IList<IWebElement> els = driver.FindElementsByXPath ("//android.widget.TextView[contains(@text, 'Animat')]");
			els = Filters.FilterDisplayed (els);
			if (!Env.isSauce ()) {
				Assert.AreEqual (els [0].Text, "Animation");
			}
			driver.FindElementByName ("App").Click();
			Thread.Sleep (3000);
			els = driver.FindElementsByAndroidUIAutomator ("new UiSelector().clickable(true)");
			Assert.GreaterOrEqual (els.Count, 10);
			Assert.IsNotNull (
				driver.FindElementByXPath("//android.widget.TextView[@text='Action Bar']"));
			els = driver.FindElementsByXPath ("//android.widget.TextView");
			els = Filters.FilterDisplayed (els);
			Assert.AreEqual (els[0].Text, "API Demos");
			driver.Navigate ().Back ();
		}

		[Test ()]
		public void ScrollTestCase ()
		{
			driver.FindElementByXPath ("//android.widget.TextView[@text='Animation']");
			IList<IWebElement> els = driver.FindElementsByXPath ("//android.widget.TextView");
			var loc1 = els [7].Location;
			var loc2 = els [3].Location;
			var swipe = Actions.Swipe (driver, loc1.X, loc1.Y, loc2.X, loc2.Y, 800);
			swipe.Perform ();
		}
			
		private IWebElement FindTouchPaint(){
			try {
				return driver.FindElementByName ("Touch Paint");								
			} catch (NoSuchElementException) {
				var els = driver.FindElementsByClassName ("android.widget.TextView");
				var loc1 = els [els.Count - 1].Location;
				var loc2 = els [0].Location;
				var swipe = Actions.Swipe (driver, loc1.X, loc1.Y, loc2.X, loc2.Y, 800);
				swipe.Perform ();
				return FindTouchPaint ();
			}
		}

		[Test ()]
		public void DrawSmileyTestCase ()
		{
			driver.FindElementByName ("Graphics").Click ();
			var el = FindTouchPaint ();
			el.Click ();
			Thread.Sleep (5000);
			ITouchAction a1 = new TouchAction ();
			a1.Press (140, 100).Release ();
			ITouchAction a2 = new TouchAction ();
			a2.Press (250, 100).Release ();
			ITouchAction smile = new TouchAction ();
			smile
				.Press (110, 200)
				.MoveTo(1, 1)
				.MoveTo(1, 1)
				.MoveTo(1, 1)
				.MoveTo(1, 1)
				.MoveTo(1, 1)
				.MoveTo(2, 1)
				.MoveTo(2, 1)
				.MoveTo(2, 1)
				.MoveTo(2, 1)
				.MoveTo(2, 1)
				.MoveTo(3, 1)
				.MoveTo(3, 1)
				.MoveTo(3, 1)
				.MoveTo(3, 1)
				.MoveTo(3, 1)
				.MoveTo(4, 1)
				.MoveTo(4, 1)
				.MoveTo(4, 1)
				.MoveTo(4, 1)
				.MoveTo(4, 1)
				.MoveTo(5, 1)
				.MoveTo(5, 1)
				.MoveTo(5, 1)
				.MoveTo(5, 1)
				.MoveTo(5, 1)
				.MoveTo(5, 0)
				.MoveTo(5, 0)
				.MoveTo(5, 0)
				.MoveTo(5, 0)
				.MoveTo(5, 0)
				.MoveTo(5, 0)
				.MoveTo(5, 0)
				.MoveTo(5, 0)
				.MoveTo(5, -1)
				.MoveTo(5, -1)
				.MoveTo(5, -1)
				.MoveTo(5, -1)
				.MoveTo(5, -1)
				.MoveTo(4, -1)
				.MoveTo(4, -1)
				.MoveTo(4, -1)
				.MoveTo(4, -1)
				.MoveTo(4, -1)
				.MoveTo(3, -1)
				.MoveTo(3, -1)
				.MoveTo(3, -1)
				.MoveTo(3, -1)
				.MoveTo(3, -1)
				.MoveTo(2, -1)
				.MoveTo(2, -1)
				.MoveTo(2, -1)
				.MoveTo(2, -1)
				.MoveTo(2, -1)
				.MoveTo(1, -1)
				.MoveTo(1, -1)
				.MoveTo(1, -1)
				.MoveTo(1, -1)
				.MoveTo(1, -1)
				.Release();

			IMultiAction m = new MultiAction (driver);
			m.Add (a1).Add(a2).Add(smile);
			m.Perform ();
			Thread.Sleep (10000);
			driver.Navigate ().Back ();
			Thread.Sleep (1000);
			driver.Navigate ().Back ();
			Thread.Sleep (1000);
		}
	}
}

