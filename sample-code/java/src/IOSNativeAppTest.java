import java.net.MalformedURLException;
import java.net.URL;

import org.openqa.selenium.remote.DesiredCapabilities;
import org.testng.Assert;
import org.testng.annotations.AfterTest;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;

import io.appium.java_client.ios.IOSDriver;
import io.appium.java_client.remote.MobileCapabilityType;

/**
 * IOS Native App Test.
 */
public class IOSNativeAppTest extends BaseTest {
    public static IOSDriver<?> mobiledriver;
    @BeforeTest
    public void beforeTest( ) throws MalformedURLException {
        DesiredCapabilities capabilities = new DesiredCapabilities();
        capabilities.setCapability(MobileCapabilityType.APPIUM_VERSION, "1.8.0");
        capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "11.4");
        capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME,"iOS");
        capabilities.setCapability(MobileCapabilityType.AUTOMATION_NAME,"XCUITest");
        capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "iPhone 7");
        capabilities.setCapability("xcodeOrgId", "YOUR_ORG_ID");
        capabilities.setCapability("xcodeSigningId", "iPhone Developer");
        capabilities.setCapability("udid", "DEVICE_UDID");
        capabilities.setCapability("bundleId", "com.apple.calculator");
        capabilities.setCapability("newCommandTimeout", 2000);
        mobiledriver = new IOSDriver<>(new URL("http://127.0.0.1:4723/wd/hub"), capabilities);
    }

    @AfterTest
    public void afterTest( ) {
        mobiledriver.quit();
    }

    @Test
    public void iOSNativeAppTest() {
        mobiledriver.findElementById("2").click();
        mobiledriver.findElementByAccessibilityId("add").click();
        mobiledriver.findElementById("8").click();
        mobiledriver.findElementByAccessibilityId("equals").click();
        String results=mobiledriver.findElementById("Result").getText();
        Assert.assertEquals(results, "10", "Result Mismatch");
    }
}