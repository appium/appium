import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.service.local.AppiumDriverLocalService;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.testng.Assert;
import org.testng.annotations.AfterSuite;
import org.testng.annotations.BeforeSuite;
import org.testng.annotations.Test;

import java.io.File;
import java.util.List;

public class AndroidSelectorsTest extends BaseTest {
    private AndroidDriver<WebElement> driver;
    private static AppiumDriverLocalService service;
    private final String PACKAGE = "io.appium.android.apis";

    @BeforeSuite
    public void setUp() throws Exception {
        File classpathRoot = new File(System.getProperty("user.dir"));
        File appDir = new File(classpathRoot, "../apps");
        File app = new File(appDir.getCanonicalPath(), "ApiDemos-debug.apk");
        DesiredCapabilities capabilities = new DesiredCapabilities();
        capabilities.setCapability("deviceName", "Android Emulator");
        capabilities.setCapability("app", app.getAbsolutePath());
        capabilities.setCapability("appPackage", "io.appium.android.apis");
        capabilities.setCapability("appActivity", ".ApiDemos");
        driver = new AndroidDriver<WebElement>(getServiceUrl(), capabilities);
    }

    @AfterSuite
    public void tearDown() {
        driver.quit();
    }

    @Test
    public void testFindElementsByAccessibilityId () {
        // Look for element by accessibility. In Android this is the "content-desc"
        List<WebElement> searchParametersElement = (List<WebElement>) driver.findElementsByAccessibilityId("Content");
        Assert.assertEquals(searchParametersElement.size(), 1);
    }

    @Test
    public void testFindElementsById () {
        // Look for element by ID. In Android this is the "resource-id"
        List<WebElement> actionBarContainerElements = (List<WebElement>) driver.findElementsById("android:id/action_bar_container");
        Assert.assertEquals(actionBarContainerElements.size(), 1);
    }

    @Test
    public void testFindElementsByClassName () {
        // Look for elements by the class name. In Android this is the Java Class Name of the view.
        List<WebElement> linearLayoutElements = (List<WebElement>) driver.findElementsByClassName("android.widget.FrameLayout");
        Assert.assertTrue(linearLayoutElements.size() > 1);
    };

    @Test
    public void testFindElementsByXPath () {
        // Find elements by XPath
        List<WebElement> linearLayoutElements = (List<WebElement>) driver.findElementsByXPath("//*[@class=\"android.widget.FrameLayout\"]");
        Assert.assertTrue(linearLayoutElements.size() > 1);
    };

}