using System;

namespace Appium.Samples.Helpers
{
	public class AppiumServers
	{
		public static Uri localURI = new Uri("http://127.0.0.1:4723/wd/hub");
		public static Uri sauceURI = new Uri("http://ondemand.saucelabs.com:80/wd/hub");
	}
}

