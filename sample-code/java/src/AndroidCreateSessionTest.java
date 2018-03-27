import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.service.local.AppiumDriverLocalService;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.testng.Assert;
import org.testng.annotations.BeforeSuite;
import org.testng.annotations.Test;

import java.io.File;

public class AndroidCreateSessionTest {
    private AndroidDriver<WebElement> driver;
    private static AppiumDriverLocalService service;

    @BeforeSuite
    public void setUp() throws Exception {
        File classpathRoot = new File(System.getProperty("user.dir"));
        File appDir = new File(classpathRoot, "../apps");
        File app = new File(appDir.getCanonicalPath(), "ApiDemos-debug.apk");
        service = AppiumDriverLocalService.buildDefaultService();
        service.start();
        DesiredCapabilities capabilities = new DesiredCapabilities();
        capabilities.setCapability("deviceName", "Android Emulator");
        capabilities.setCapability("app", app.getAbsolutePath());
        capabilities.setCapability("appPackage", "io.appium.android.apis");
        capabilities.setCapability("appActivity", ".ApiDemos");
        driver = new AndroidDriver<WebElement>(service.getUrl(), capabilities);
    }

    @Test()
    public void testExample() {
        String activity = driver.currentActivity();
        String pkg = driver.getCurrentPackage();
        Assert.assertEquals(activity, ".ApiDemos");
        Assert.assertEquals(pkg, "io.appium.android.apis");
    }
}