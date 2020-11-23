import io.appium.java_client.MobileBy;
import io.appium.java_client.ios.IOSDriver;
import io.appium.java_client.ios.IOSElement;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;
import org.testng.annotations.*;

import java.io.File;
import java.io.IOException;

public class IOSBasicInteractionsTest extends BaseTest {
    private IOSDriver<WebElement> driver;

    @BeforeTest
    public void setUp() throws IOException {
        File classpathRoot = new File(System.getProperty("user.dir"));
        File appDir = new File(classpathRoot, "../apps");
        File app = new File(appDir.getCanonicalPath(), "TestApp.app.zip");

        String deviceName = System.getenv("IOS_DEVICE_NAME");
        String platformVersion = System.getenv("IOS_PLATFORM_VERSION");
        DesiredCapabilities capabilities = new DesiredCapabilities();
        /*
        'deviceName' capability only affects device selection if you run the test in a cloud
        environment or your run your test on a Simulator device. This combination of this value
        plus `platformVersion` capability value
        is used to select a proper Simulator if it already exists. Use `xcrun simctl list` command
        to list available Simulator devices.
        */
        capabilities.setCapability("deviceName", deviceName == null ? "iPhone 6s" : deviceName);

        /*
        udid value must be set if you run your test on a real iOS device.
        The udid of your real device could be retrieved from Xcode->Windows->Devices and Simulators
        dialog.
        Usually, it is not enough to simply provide udid itself in order to automate apps
        on real iOS devices. You must also verify the target device is included into
        your Apple developer profile and the WebDriverAgent is signed with a proper signature.
        Refer https://github.com/appium/appium-xcuitest-driver/blob/master/docs/real-device-config.md
        for more details.
        */
        // capabilities.setCapability("udid", "ABCD123456789");

        /*
        Platform version is required to be set. Only the major and minor version numbers have effect.
        Check `xcrun simctl list` to see which platform versions are available if the test is going
        to run on a Simulator.
        */
        capabilities.setCapability("platformVersion", platformVersion == null ? "11.1" : platformVersion);

        /*
        It is recommended to set a full path to the app being tested.
        Appium for iOS supports .app and .ipa application bundles.
        It is also possible to pass zipped .app packages (they will be extracted automatically).

        Make sure the application is built for correct architecture (either
        real device or Simulator) before running your tests, as there are not interchangeable.
        If the test is going to run on a real device then make sure your app
        is signed with correct development signature (as described in the above
        Real Device Config document)

        If this capability is not set then your test starts on Springboard view.
        It is also possible to provide an URL where the app is located.
        */
        capabilities.setCapability("app", app.getAbsolutePath());

        /*
        This is the only supported automation backend for iOS
        */
        capabilities.setCapability("automationName", "XCUITest");

        /*
        There are much more capabilities and driver settings, that allow
        you to customize and tune your test to achieve the best automation
        experience. Read http://appium.io/docs/en/writing-running-appium/caps/
        and http://appium.io/docs/en/advanced-concepts/settings/
        for more details.

        Feel free to visit our forum at https://discuss.appium.io/
        if you have more questions.
        */

        driver = new IOSDriver<WebElement>(getServiceUrl(), capabilities);
    }

    @AfterTest
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
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

        // Dismiss the alert
        IOSElement okButtonElement = (IOSElement) new WebDriverWait(driver, 30)
                .until(ExpectedConditions.visibilityOfElementLocated(MobileBy.AccessibilityId("OK")));
        okButtonElement.click();
    }
}
