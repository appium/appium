using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Appium;
using OpenQA.Selenium.Appium.Enums;
using OpenQA.Selenium.Appium.iOS;
using OpenQA.Selenium.Remote;
using System;
using AppiumDotNetSamples.Helper;

namespace AppiumDotNetSamples
{
    [TestFixture()]
    public class IOSBasicInteractionsTest
    {
        private IOSDriver<IOSElement> driver;

        [SetUp()]
        public void BeforeAll()
        {
            DesiredCapabilities capabilities = new DesiredCapabilities();
            capabilities.SetCapability(MobileCapabilityType.BrowserName, "");
            capabilities.SetCapability(MobileCapabilityType.PlatformName, "iOS");
            capabilities.SetCapability(MobileCapabilityType.PlatformVersion, App.IOSPlatformVersion());
            capabilities.SetCapability(MobileCapabilityType.AutomationName, "XCUITest");
            capabilities.SetCapability(MobileCapabilityType.DeviceName, App.IOSDeviceName());
            capabilities.SetCapability(MobileCapabilityType.App, App.IOSApp());

            driver = new IOSDriver<IOSElement>(Env.ServerUri(), capabilities, Env.INIT_TIMEOUT_SEC);
            driver.Manage().Timeouts().ImplicitWait = Env.IMPLICIT_TIMEOUT_SEC;
        }

        [TearDown()]
        public void AfterAll()
        {
            driver.Quit();
        }

        [Test()]
        public void TestShouldSendKetsToInputs()
        {
            IOSElement textField = driver.FindElementById("TextField1");
            Assert.Null(textField.GetAttribute("value"));

            textField.SendKeys("Hello World!");
            Assert.AreEqual("Hello World!", textField.GetAttribute("value"));
        }

        [Test()]
        public void TestShouldClickAButtonThatOpensAnAlert()
        {
            IOSElement buttonElement = driver.FindElementByAccessibilityId("show alert");
            buttonElement.Click();

            String alertTitle = "Cool title";
            IOSElement alertTitleElement = driver.FindElementByAccessibilityId(alertTitle);
            Assert.AreEqual(alertTitle, alertTitleElement.GetAttribute("name"));
        }
    }
}
