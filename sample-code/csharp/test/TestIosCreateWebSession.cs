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
    public class IOSCreateWebSessionTest
    {

        private IWebDriver driver;

        [OneTimeSetUp()]
        public void BeforeAll()
        {
            DesiredCapabilities capabilities = new DesiredCapabilities();
            capabilities.SetCapability(MobileCapabilityType.BrowserName, "Safari");
            capabilities.SetCapability(MobileCapabilityType.PlatformName, "iOS");
            capabilities.SetCapability(MobileCapabilityType.PlatformVersion, App.IOSPlatformVersion());
            capabilities.SetCapability(MobileCapabilityType.AutomationName, "XCUITest");
            capabilities.SetCapability(MobileCapabilityType.DeviceName, App.IOSDeviceName());

            driver = new IOSDriver<IWebElement>(Env.ServerUri(), capabilities, Env.INIT_TIMEOUT_SEC);
            driver.Manage().Timeouts().ImplicitWait = Env.IMPLICIT_TIMEOUT_SEC;
        }

        [Test()]
        public void TestShouldCreateAndDestroyIOSWebSessions()
        {
            driver.Url = "https://www.google.com";
            String title = driver.Title;
            Assert.AreEqual("Google", title);

            driver.Quit();

            Assert.Throws<WebDriverException>(
                () => { title = driver.Title; });
        }
    }
}
