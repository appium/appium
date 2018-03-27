import io.appium.java_client.ios.IOSDriver;
import io.appium.java_client.ios.IOSElement;
import io.appium.java_client.service.local.AppiumDriverLocalService;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.testng.Assert;
import org.testng.annotations.AfterSuite;
import org.testng.annotations.BeforeSuite;
import org.testng.annotations.Test;

import java.io.File;

public class IOSCreateWebSessionTest {
    private IOSDriver<WebElement> driver;
    private static AppiumDriverLocalService service;

    @BeforeSuite
    public void setUp() throws Exception {
        service = AppiumDriverLocalService.buildDefaultService();
        service.start();

        String deviceName = System.getenv("IOS_DEVICE_NAME");
        String platformVersion = System.getenv("IOS_PLATFORM_VERSION");
        DesiredCapabilities capabilities = new DesiredCapabilities();
        capabilities.setCapability("deviceName", deviceName == null ? "iPhone 6s" : deviceName);
        capabilities.setCapability("platformVerison", platformVersion == null ? "11.1" : platformVersion);
        capabilities.setCapability("browserName", "Safari");
        capabilities.setCapability("automationName", "XCUITest");
        driver = new IOSDriver<WebElement>(service.getUrl(), capabilities);
    }

    @AfterSuite
    public void tearDown() {
        driver.quit();
    }

    @Test()
    public void testCreateSafariSession() {
        // Navigate to google.com
        driver.get("https://www.google.com");

        // Test that it was successful by checking the document title
        String pageTitle = driver.getTitle();
        Assert.assertEquals(pageTitle, "Google");

    }
}