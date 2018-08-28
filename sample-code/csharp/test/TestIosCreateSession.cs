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
    public class IOSCreateSessionTest
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

            driver = new IOSDriver<IOSElement>(Env.ServerUri(), capabilities, Env.INIT_TIMEOUT_SEC);
            driver.Manage().Timeouts().ImplicitWait = Env.IMPLICIT_TIMEOUT_SEC;
        }

        [Test()]
        public void TestShouldCreateAndDestroyIOSSessions()
        {
            IOSElement element = driver.FindElementByClassName("XCUIElementTypeApplication");
            String application_name = element.GetAttribute("name");
            Assert.AreEqual("TestApp", application_name);

            driver.Quit();

            Assert.Throws<WebDriverException>(
                () => { element.GetAttribute("name"); });
        }
    }
}
