using System;
using OpenQA.Selenium.Remote;

namespace Appium.Samples.Helpers
{
	public class Caps
	{
		public static DesiredCapabilities getIos71Caps (string app) {
			DesiredCapabilities capabilities = new DesiredCapabilities();
			capabilities.SetCapability("browserName", "");
			capabilities.SetCapability("appium-version", "1.0");
			capabilities.SetCapability("platformName", "iOS");
			capabilities.SetCapability("platformVersion", "7.1");
			capabilities.SetCapability("deviceName", "iPhone Simulator");
			capabilities.SetCapability("app", app);
			return capabilities;
		}

		public static DesiredCapabilities getAndroid18Caps (string app) {
			DesiredCapabilities capabilities = new DesiredCapabilities();
			capabilities.SetCapability("browserName", "");
			capabilities.SetCapability("appium-version", "1.0");
			capabilities.SetCapability("platformName", "Android");
			capabilities.SetCapability("platformVersion", "4.3");
			capabilities.SetCapability("deviceName", "Android Emulator");
			capabilities.SetCapability("app", app);
			return capabilities;
		}

		public static DesiredCapabilities getAndroid19Caps (string app) {
			DesiredCapabilities capabilities = new DesiredCapabilities();
			capabilities.SetCapability("browserName", "");
			capabilities.SetCapability("appium-version", "1.0");
			capabilities.SetCapability("platformName", "Android");
			capabilities.SetCapability("platformVersion", "4.4.2");
			capabilities.SetCapability("deviceName", "Android Emulator");
			capabilities.SetCapability("app", app);
			return capabilities;
		}

		public static DesiredCapabilities getSelendroid16Caps (string app) {
			DesiredCapabilities capabilities = new DesiredCapabilities();
			capabilities.SetCapability("browserName", "");
			capabilities.SetCapability("appium-version", "1.0");
			capabilities.SetCapability("platformName", "Android");
			capabilities.SetCapability("platformVersion", "4.1");
			capabilities.SetCapability("automationName", "selendroid");
			capabilities.SetCapability("deviceName", "Android Emulator");
			capabilities.SetCapability("app", app);
			return capabilities;
		}
	}
}

