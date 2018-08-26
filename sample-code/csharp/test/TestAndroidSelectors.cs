using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Appium;
using OpenQA.Selenium.Appium.Enums;
using OpenQA.Selenium.Appium.Android;
using OpenQA.Selenium.Remote;
using System;
using System.Collections.Generic;
using AppiumDotNetSamples.Helper;

namespace AppiumDotNetSamples
{
    [TestFixture()]
    public class AndroidSelectorsTest
    {
        private AndroidDriver<AndroidElement> driver;

        [OneTimeSetUp()]
        public void BeforeAll()
        {
            DesiredCapabilities capabilities = new DesiredCapabilities();
            capabilities.SetCapability(MobileCapabilityType.BrowserName, "");
            capabilities.SetCapability(MobileCapabilityType.PlatformName, App.AndroidDeviceName());
            capabilities.SetCapability(MobileCapabilityType.PlatformVersion, App.AndroidPlatformVersion());
            capabilities.SetCapability(MobileCapabilityType.AutomationName, "UIAutomator2");
            capabilities.SetCapability(MobileCapabilityType.DeviceName, "Nexus");

            capabilities.SetCapability(MobileCapabilityType.App, App.AndroidApp());

            driver = new AndroidDriver<AndroidElement>(Env.ServerUri(), capabilities, Env.INIT_TIMEOUT_SEC);
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
            ICollection<AndroidElement> elements = driver.FindElementsByAccessibilityId("Content");
            Assert.AreEqual(1, elements.Count);
        }

        [Test()]
        public void TestShouldFindElementsById()
        {
            ICollection<AndroidElement> elements = driver.FindElementsById("android:id/action_bar_container");
            Assert.AreEqual(1, elements.Count);
        }

        [Test()]
        public void TestShouldFindElementsByClassName()
        {
            ICollection<AndroidElement> elements = driver.FindElementsByClassName("android.widget.FrameLayout");
            Assert.AreEqual(3, elements.Count);
        }

        [Test()]
        public void TestShouldFindElementsByXPath()
        {
            ICollection<AndroidElement> elements = driver.FindElementsByXPath("//*[@class='android.widget.FrameLayout']");
            Assert.AreEqual(3, elements.Count);
        }
    }
}
