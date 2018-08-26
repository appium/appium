using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Appium;
using OpenQA.Selenium.Appium.Enums;
using OpenQA.Selenium.Appium.Android;
using OpenQA.Selenium.Remote;
using System;
using AppiumDotNetSamples.Helper;

namespace AppiumDotNetSamples
{
    [TestFixture()]
    public class AndroidCreateWebSessionTest
    {

        private IWebDriver driver;

        [OneTimeSetUp()]
        public void BeforeAll()
        {
            DesiredCapabilities capabilities = new DesiredCapabilities();
            capabilities.SetCapability(MobileCapabilityType.BrowserName, "Chrome");
            capabilities.SetCapability(MobileCapabilityType.PlatformName, App.AndroidDeviceName());
            capabilities.SetCapability(MobileCapabilityType.PlatformVersion, App.AndroidPlatformVersion());
            capabilities.SetCapability(MobileCapabilityType.AutomationName, "UIAutomator2");
            capabilities.SetCapability(MobileCapabilityType.DeviceName, "Nexus");

            driver = new AndroidDriver<AppiumWebElement>(Env.ServerUri(), capabilities, Env.INIT_TIMEOUT_SEC);
            driver.Manage().Timeouts().ImplicitWait = Env.IMPLICIT_TIMEOUT_SEC;
        }

        [Test()]
        public void TestShouldCreateAndDestroyAndroidwebSessions()
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
