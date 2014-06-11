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
using System.Collections.ObjectModel;

namespace Appium.Samples
{
	[TestFixture ()]
	public class IosComplexTest
	{
		private AppiumDriver driver;
		private bool allPassed = true;

		[TestFixtureSetUp]
		public void beforeAll(){
			DesiredCapabilities capabilities = Caps.getIos71Caps (Apps.get("iosUICatalogApp")); 
			if (Env.isSauce ()) {
				capabilities.SetCapability("username", Env.getEnvVar("SAUCE_USERNAME")); 
				capabilities.SetCapability("accessKey", Env.getEnvVar("SAUCE_ACCESS_KEY"));
				capabilities.SetCapability("name", "ios - complex");
				capabilities.SetCapability("tags", new string[]{"sample"});
			}
			Uri serverUri = Env.isSauce () ? AppiumServers.sauceURI : AppiumServers.localURI;
			driver = new AppiumDriver(serverUri, capabilities, Env.INIT_TIMEOUT_SEC);	
			driver.Manage().Timeouts().ImplicitlyWait(Env.IMPLICIT_TIMEOUT_SEC);
		}

		[TestFixtureTearDown]
		public void afterAll(){
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

		private void ClickMenuItem(string name) 
		{
			IWebElement el;
			try {
				el = driver.FindElementByName (name);
			} catch {
				var els = driver.FindElementByClassName ("UIATableView")
					.FindElements(By.ClassName ("UIATableCell"));
				el = Filters.FirstWithName (els, name);
			}
			el.Click();
			Thread.Sleep (1000);
		}

		[Test ()]
		public void PrintNameTestCase ()
		{
			var els = driver.FindElementByClassName ("UIATableView")
				.FindElements(By.ClassName ("UIATableCell"));
			for (int i = 0; i < els.Count; i++) 
			{
				Console.WriteLine (els [i].GetAttribute ("name"));
			}
		}

		[Test ()]
		public void FindElementTestCase ()
		{
			// first view in UICatalog is a table
			var el = driver.FindElementByClassName ("UIATableView");
			Assert.IsNotNull (el);
			// check the number of cells/rows inside the  table
			IList<IWebElement> els = el.FindElements (By.ClassName ("UIATableCell"));
			els = Filters.FilterDisplayed (els);
			Assert.Greater (els.Count, 6);
			// various checks
			Assert.IsNotNull (els[0].GetAttribute("name"));
			Assert.IsNotNull (driver.FindElementByClassName ("UIANavigationBar"));
		}

		[Test ()]
		public void SwitchContextTestCase ()
		{
			ClickMenuItem ("Web View, AAPLWebViewController");
			// get the contexts and switch to webview
			Assert.AreEqual(driver.GetContexts(), 
				new List<string> {"NATIVE_APP", "WEBVIEW_1"});
			driver.SetContext ("WEBVIEW_1");
			// find the store link
			Thread.Sleep (1000);
			Assert.IsNotNull(driver.FindElementById ("gn-apple"));
			// leave the webview
			driver.SetContext ("NATIVE_APP");
			//Verify we are out of the webview
			Assert.IsNotNull(driver.FindElementByClassName ("UIAScrollView"));

			driver.Navigate().Back ();
		}

		[Test ()]
		public void LocationTestCase ()
		{
			IList<IWebElement> els = driver.FindElementsByClassName ("UIATableCell");
			els = Filters.FilterDisplayed (els);
			var loc = els [2].Location;
			Assert.AreEqual (loc.X, 0);
			Assert.Greater (loc.Y, 100);
		}

		[Test ()]
		public void ScreenshotTestCase ()
		{
			Screenshot screenshot = driver.GetScreenshot ();
			Assert.IsNotNull (screenshot);
		}

		[Test ()]
		public void EditTextFieldTestCase ()
		{
			ClickMenuItem ("Text Fields, AAPLTextFieldViewController");
			// get the field and the default/empty text
			var el = driver.FindElementByClassName ("UIATextField");
			var defaultValue = el.GetAttribute ("value");
			// type something
			el.SendKeys ("1234 appium");
			Assert.AreEqual(el.GetAttribute("value"), "1234 appium");
			driver.FindElementByName ("Done").Click();
			Thread.Sleep (1000);
			el.Clear ();
			Assert.AreEqual(el.GetAttribute("value"), defaultValue);

			driver.Navigate().Back ();
		}

		[Test ()]
		public void AlertTestCase ()
		{
			ClickMenuItem ("Alert Views, AAPLAlertViewController");
			{
				// trigger simple alert
				driver.FindElementByName ("Simple").Click ();
				IAlert alert = driver.SwitchTo ().Alert ();
				Assert.IsTrue (alert.Text.Contains ("A Short Title Is Best"));
				alert.Dismiss ();
			}
			{
				// trigger modal alert with cancel & ok buttons
				driver.FindElementByName ("Okay / Cancel").Click ();
				IAlert alert = driver.SwitchTo ().Alert ();
				Assert.IsTrue (alert.Text.Contains ("A Short Title Is Best"));
				alert.Accept ();
			}

			driver.Navigate().Back ();
		}

		[Test ()]
		public void SliderTestCase ()
		{
			ClickMenuItem ("Sliders, AAPLSliderViewController");
			// retrieve slider, check initial value
			var slider = (AppiumWebElement) driver.FindElementByClassName ("UIASlider");
			Assert.AreEqual (slider.GetAttribute("value"), "42%");
			// change value
			slider.SetImmediateValue ("0%");
			Assert.AreEqual (slider.GetAttribute("value"), "0%");

			driver.Navigate().Back ();
		}

		[Test ()]
		public void ElementSizeTestCase ()
		{
			var s1 = driver.FindElementByClassName ("UIATableView").Size;
			var s2 = driver.FindElementByClassName ("UIATableCell").Size;
			Assert.AreEqual (s1.Width, s2.Width);
			Assert.AreNotEqual (s1.Height, s2.Height);
		}

		[Test ()]
		public void SourceTestCase ()
		{
			// main menu source
			var mainMenuSource = driver.PageSource;
			Assert.IsTrue (mainMenuSource.Contains("UIAStaticText"));
			Assert.IsTrue (mainMenuSource.Contains("Text Fields"));
			// text fields section source
			ClickMenuItem ("Text Fields, AAPLTextFieldViewController");
			var textFieldSectionSource = driver.PageSource;
			Assert.IsTrue (textFieldSectionSource.Contains("UIAStaticText"));
			Assert.IsTrue (textFieldSectionSource.Contains("Text Fields"));
			Assert.AreNotEqual (textFieldSectionSource, mainMenuSource);

			driver.Navigate().Back ();
		}

	}
}
