using System;

namespace AppiumDotNetSamples.Helper
{
    public static class Env
    {
        // Please specify your working directory since sometimes it fails to get working directory with `Environment.CurrentDirectory`
        // e.g. APPIUM_ROOT_PATH=/path/to/your/
        public static String rootDirectory = System.IO.Path.GetFullPath($"{System.AppDomain.CurrentDomain.BaseDirectory.ToString()}/../../../..");

        static public bool IsSauce()
        {
            return Environment.GetEnvironmentVariable("SAUCE_LABS") != null;
        }

        static public Uri ServerUri()
        {
            String sauceUserName = Environment.GetEnvironmentVariable("SAUCE_USERNAME");
            String sauceAccessKey = Environment.GetEnvironmentVariable("SAUCE_ACCESS_KEY");

            return (sauceUserName == null) || (sauceAccessKey == null)
                ? new Uri("http://localhost:4723/wd/hub")
                : new Uri($"https://{sauceUserName}:{sauceAccessKey}@ondemand.saucelabs.com:80/wd/hub");
        }

        public static TimeSpan INIT_TIMEOUT_SEC = TimeSpan.FromSeconds(180);
        public static TimeSpan IMPLICIT_TIMEOUT_SEC = TimeSpan.FromSeconds(10);
    }

    public static class App
    {
        static public String IOSApp()
        {
            return Env.IsSauce() ? "http://appium.github.io/appium/assets/TestApp7.1.app.zip" : $"{Env.rootDirectory}/apps/TestApp.app.zip";
        }

        static public String IOSDeviceName()
        {
            return Environment.GetEnvironmentVariable("IOS_DEVICE_NAME") ?? "iPhone 6s";
        }

        static public String IOSPlatformVersion()
        {
            return Environment.GetEnvironmentVariable("IOS_PLATFORM_VERSION") ?? "11.4";
        }

        static public String AndroidApp()
        {
            return Env.IsSauce() ? "http://appium.github.io/appium/assets/ApiDemos-debug.apk" : $"{Env.rootDirectory}/apps/ApiDemos-debug.apk";
        }

        static public String AndroidDeviceName()
        {
            return Environment.GetEnvironmentVariable("ANDROID_DEVICE_VERSION") ?? "Android";
        }

        static public String AndroidPlatformVersion()
        {
            return Environment.GetEnvironmentVariable("ANDROID_PLATFORM_VERSION") ?? "7.1";
        }
    }
}
