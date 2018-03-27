import io.appium.java_client.MobileBy;
import io.appium.java_client.ios.IOSDriver;
import io.appium.java_client.ios.IOSElement;
import io.appium.java_client.service.local.AppiumDriverLocalService;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;
import org.testng.annotations.AfterSuite;
import org.testng.annotations.BeforeSuite;
import org.testng.annotations.Test;

import java.io.File;

public class IOSBasicInteractionsTest {
    private IOSDriver<WebElement> driver;
    private static AppiumDriverLocalService service;

    @BeforeSuite
    public void setUp() throws Exception {
        File classpathRoot = new File(System.getProperty("user.dir"));
        File appDir = new File(classpathRoot, "../apps");
        File app = new File(appDir.getCanonicalPath(), "TestApp.app.zip");
        service = AppiumDriverLocalService.buildDefaultService();
        service.start();

        String deviceName = System.getenv("IOS_DEVICE_NAME");
        String platformVersion = System.getenv("IOS_PLATFORM_VERSION");
        DesiredCapabilities capabilities = new DesiredCapabilities();
        capabilities.setCapability("deviceName", deviceName == null ? "iPhone 6s" : deviceName);
        capabilities.setCapability("platformVerison", platformVersion == null ? "11.1" : platformVersion);
        capabilities.setCapability("app", app.getAbsolutePath());
        capabilities.setCapability("automationName", "XCUITest");
        driver = new IOSDriver<WebElement>(service.getUrl(), capabilities);
    }

    @AfterSuite
    public void tearDown() {
        driver.quit();
    }

    @Test
    public void testSendKeysToInput () {
        // Find TextField input element
        String textInputId = "TextField1";
        IOSElement textViewsEl = (IOSElement) new WebDriverWait(driver, 30)
                .until(ExpectedConditions.visibilityOfElementLocated(MobileBy.AccessibilityId(textInputId)));

        // Check that it doesn"t have a value
        String value = textViewsEl.getAttribute("value");
        Assert.assertEquals(value, null);

        // Send keys to that input
        textViewsEl.sendKeys("Hello World!");

        // Check that the input has new value
        value = textViewsEl.getAttribute("value");
        Assert.assertEquals(value, "Hello World!");
    }

    @Test
    public void testOpenAlert () {
        // Find Button element and click on it
        String buttonElementId = "show alert";
        IOSElement buttonElement = (IOSElement) new WebDriverWait(driver, 30)
                .until(ExpectedConditions.visibilityOfElementLocated(MobileBy.AccessibilityId(buttonElementId)));
        buttonElement.click();

        // Wait for the alert to show up
        String alertTitleId = "Cool title";
        IOSElement alertTitleElement = (IOSElement) new WebDriverWait(driver, 30)
                .until(ExpectedConditions.visibilityOfElementLocated(MobileBy.AccessibilityId(alertTitleId)));

        // Check the text
        String alertTitle = alertTitleElement.getText();
        Assert.assertEquals(alertTitle, "Cool title");
    }
}