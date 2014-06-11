using System;
using System.Collections.Generic;

namespace Appium.Samples.Helpers
{
	public class Apps
	{
		static Dictionary<string, string> DEV = new Dictionary<string, string> {
			{ "iosTestApp", "sample-code/apps/TestApp/build/Release-iphonesimulator/TestApp.app" },
			{ "iosWebviewApp", "sample-code/apps/WebViewApp/build/Release-iphonesimulator/WebViewApp.app" },
			{ "iosUICatalogApp", "sample-code/apps/UICatalog/build/Release-iphonesimulator/UICatalog.app" },
			{ "androidApiDemos", "sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk" },
			{ "selendroidTestApp", "sample-code/apps/selendroid-test-app.apk" },
			{ "iosWebviewAppLocal", "sample-code/apps/WebViewApp/build/Release-iphonesimulator/WebViewApp.app" },
			{ "androidApiDemosLocal", "sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk" }
		};

		static Dictionary<string, string> DEFAULT = new Dictionary<string, string> {
			{ "iosTestApp", "http://appium.github.io/appium/assets/TestApp7.1.app.zip" },
			{ "iosWebviewApp", "http://appium.github.io/appium/assets/WebViewApp7.1.app.zip" },
			{ "iosUICatalogApp", "http://appium.github.io/appium/assets/UICatalog7.1.app.zip" },
			{ "androidApiDemos", "http://appium.github.io/appium/assets/ApiDemos-debug.apk" },
			{ "selendroidTestApp", "http://appium.github.io/appium/assets/selendroid-test-app-0.10.0.apk" },
			{ "iosWebviewAppLocal", "http://localhost:3000/WebViewApp7.1.app.zip" },
			{ "androidApiDemosLocal", "http://localhost:3001/ApiDemos-debug.apk" }
		};
			
		public static string get(string appKey) {
			if (Env.isDev()) {
				return DEV[appKey];
			} else {
				return DEFAULT[appKey];			
			}
		}
	}
}
