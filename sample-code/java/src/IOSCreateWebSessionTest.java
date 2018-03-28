import io.appium.java_client.ios.IOSDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.testng.Assert;
import org.testng.annotations.AfterSuite;
import org.testng.annotations.BeforeSuite;
import org.testng.annotations.Test;

import java.io.IOException;

public class IOSCreateWebSessionTest extends BaseTest {
    private IOSDriver<WebElement> driver;

    @BeforeSuite
    public void setUp() throws IOException {
        String deviceName = System.getenv("IOS_DEVICE_NAME");
        String platformVersion = System.getenv("IOS_PLATFORM_VERSION");
        DesiredCapabilities capabilities = new DesiredCapabilities();
        capabilities.setCapability("deviceName", deviceName == null ? "iPhone 6s" : deviceName);
        capabilities.setCapability("platformVerison", platformVersion == null ? "11.1" : platformVersion);
        capabilities.setCapability("browserName", "Safari");
        capabilities.setCapability("automationName", "XCUITest");
        driver = new IOSDriver<WebElement>(getServiceUrl(), capabilities);
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