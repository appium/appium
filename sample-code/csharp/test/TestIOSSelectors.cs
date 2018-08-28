using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Appium;
using OpenQA.Selenium.Appium.Enums;
using OpenQA.Selenium.Appium.iOS;
using OpenQA.Selenium.Remote;
using System;
using System.Collections.Generic;
using AppiumDotNetSamples.Helper;

namespace AppiumDotNetSamples
{
    [TestFixture()]
    public class IOSSelectorsTest
    {
        private IOSDriver<IOSElement> driver;

        [OneTimeSetUp()]
        public void BeforeAll()
        {
            DesiredCapabilities capabilities = new DesiredCapabilities();
            capabilities.SetCapability(MobileCapabilityType.BrowserName, "");
            capabilities.SetCapability(MobileCapabilityType.PlatformName, "iOS");
            capabilities.SetCapability(MobileCapabilityType.PlatformVersion, App.IOSPlatformVersion());
            capabilities.SetCapability(MobileCapabilityType.AutomationName, "XCUITest");
            capabilities.SetCapability(MobileCapabilityType.DeviceName, App.IOSDeviceName());
            capabilities.SetCapability(MobileCapabilityType.App, App.IOSApp());

            driver = new IOSDriver<IOSElement> (Env.ServerUri(), capabilities, Env.INIT_TIMEOUT_SEC);
            driver.Manage().Timeouts().ImplicitWait = Env.IMPLICIT_TIMEOUT_SEC;
        }

        [OneTimeTearDown()]
        public void AfterAll()
        {
            driver.Quit();
        }

        [Test()]
        public void TestShouldFindElementsByAccessibilityId()
        {
            ICollection<IOSElement> elements = driver.FindElementsByAccessibilityId("ComputeSumButton");
            Assert.AreEqual(1, elements.Count);
        }

        [Test()]
        public void TestShouldFindElementsByClassName()
        {
            ICollection<IOSElement> elements = driver.FindElementsByClassName("XCUIElementTypeWindow");
            Assert.AreEqual(2, elements.Count);
        }

        [Test()]
        public void TestShouldFindElementsByPredicate()
        {
            // need newer version to use FindElementsByNSPredicate
            ICollection<IOSElement> elements = driver.FindElements("-ios predicate string", "visible = 1");
            Assert.AreEqual(27, elements.Count);
        }

        [Test()]
        public void TestShouldFindElementsByClassChain()
        {
            // need newer version to use FindElementsByClassChain
            ICollection<IOSElement> elements = driver.FindElements("-ios class chain", "XCUIElementTypeWindow[1]/*[2]");
            Assert.AreEqual(1, elements.Count);
        }

        [Test()]
        public void TestShouldFindElementsByXPath()
        {
            ICollection<IOSElement> elements = driver.FindElementsByXPath("//XCUIElementTypeWindow//XCUIElementTypeButton");
            Assert.AreEqual(8, elements.Count);
        }
    }
}
