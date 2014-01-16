package com.saucelabs.appium;

import org.apache.commons.lang.RandomStringUtils;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.util.EntityUtils;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import org.openqa.selenium.*;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.interactions.HasTouchScreen;
import org.openqa.selenium.interactions.TouchScreen;
import org.openqa.selenium.interactions.touch.TouchActions;
import org.openqa.selenium.remote.*;

import java.io.File;
import java.net.URL;
import java.util.List;

import static org.junit.Assert.*;

/**
 * <a href="https://github.com/appium/appium">Appium</a> test which runs against a local Appium instance deployed
  * with the 'UICatalog' iPhone project which is included in the Appium source distribution.
 *
 * @author Ross Rowe
 */
public class UICatalogTest {

    private WebDriver driver;

    private WebElement row;

    @Before
    public void setUp() throws Exception {
        // set up appium
        File classpathRoot = new File(System.getProperty("user.dir"));
        File appDir = new File(classpathRoot, "../../../apps/UICatalog/build/Release-iphonesimulator");
        File app = new File(appDir, "UICatalog.app");
        DesiredCapabilities capabilities = new DesiredCapabilities();
        capabilities.setCapability(CapabilityType.BROWSER_NAME, "");
        capabilities.setCapability(CapabilityType.VERSION, "6.1");
        capabilities.setCapability(CapabilityType.PLATFORM, "Mac");
        capabilities.setCapability("device", "iPhone Simulator");
        capabilities.setCapability("app", app.getAbsolutePath());
        driver = new SwipeableWebDriver(new URL("http://127.0.0.1:4723/wd/hub"), capabilities);
    }

    @After
    public void tearDown() throws Exception {
        driver.quit();
    }

    private void openMenuPosition(int index) {
        //populate text fields with two random number
        WebElement table = driver.findElement(By.tagName("tableView"));
        row = table.findElements(By.tagName("tableCell")).get(index);
        row.click();
    }

    @Test
    public void testFindElement() throws Exception {
        //first view in UICatalog is a table
        WebElement table = driver.findElement(By.tagName("tableView"));
        assertNotNull(table);
        //is number of cells/rows inside table correct
        List<WebElement> rows = table.findElements(By.tagName("tableCell"));
        assertEquals(12, rows.size());
        //is first one about buttons
        assertEquals("Buttons, Various uses of UIButton", rows.get(0).getAttribute("name"));
        //navigationBar is not inside table
        WebElement nav_bar = null;
        try {
            nav_bar = table.findElement(By.tagName("navigationBar"));
        } catch (NoSuchElementException e) {
            //expected
        }
        assertNull(nav_bar);
        //there is nav bar inside the app
        driver.getPageSource();
        nav_bar = driver.findElement(By.tagName("navigationBar"));
        assertNotNull(nav_bar);
    }


    @Test
    public void test_location() {
        //get third row location
        row = driver.findElements(By.tagName("tableCell")).get(2);
        assertEquals(0, row.getLocation().getX());
        assertEquals(152, row.getLocation().getY());
    }

    @Test
    @Ignore("Currently failing due to IllegalArgumentException: Superclass has no null constructors but no arguments were given")
    public void testScreenshot() {
        //make screenshot and get is as base64
        WebDriver augmentedDriver = new Augmenter().augment(driver);
        String screenshot = ((TakesScreenshot) augmentedDriver).getScreenshotAs(OutputType.BASE64);

        assertNotNull(screenshot);
        //make screenshot and save it to the local filesystem
        File file = ((TakesScreenshot) augmentedDriver).getScreenshotAs(OutputType.FILE);
        assertNotNull(file);
    }

    @Test
    @Ignore("Currently failing because no element with a tag name of 'segmentedControl' can be found")
    public void testAttributes() {
        //go to the toolbar section
        openMenuPosition(8);

        WebElement segmented_control = driver.findElement(By.tagName("segmentedControl"));
        //segmented_control is enabled by default
        assertTrue(segmented_control.isEnabled());
        assertTrue(segmented_control.isDisplayed());
        //row is from previous view, should not be visible
        assertFalse(row.isDisplayed());

        WebElement tinted_switch = driver.findElements(By.tagName("switch")).get(1);
        assertEquals("Tinted", tinted_switch.getText());
        //check if it is in "off" position
        assertEquals(new Integer(0), Integer.valueOf(tinted_switch.getAttribute("value")));
        tinted_switch.click();
        //check if it is in "on" position
        assertEquals(new Integer(1), Integer.valueOf(tinted_switch.getAttribute("value")));
        //segmented_control should now be disabled
        assertFalse(segmented_control.isEnabled());
    }

    @Test
    public void testTextFieldEdit() {
        //go to the text fields section
        openMenuPosition(2);
        WebElement text_field = driver.findElements(By.tagName("textField")).get(0);
        //get default/empty text
        String default_val = text_field.getAttribute("value");
        //write some random text to element
        String rnd_string = RandomStringUtils.randomAlphanumeric(6);
        text_field.sendKeys(rnd_string);
        assertEquals(rnd_string, text_field.getAttribute("value"));
        //send some random keys
        String rnd_string2 = RandomStringUtils.randomAlphanumeric(6);
        Actions swipe = new Actions(driver).sendKeys(rnd_string2);
        swipe.perform();
        //check if text is there
        assertEquals(rnd_string + rnd_string2, text_field.getAttribute("value"));
        //clear
        text_field.clear();
        //check if is empty/has default text
        assertEquals(default_val, text_field.getAttribute("value"));
    }

    @Test
    public void testAlertInteraction() {
        //go to the alerts section
        openMenuPosition(10);
        List<WebElement> elements = driver.findElements(By.tagName("staticText"));

        //trigger modal alert with cancel & ok buttons
        WebElement triggerOkCancel = elements.get(24);
        triggerOkCancel.click();
        Alert alert = driver.switchTo().alert();
        //check if title of alert is correct
        assertEquals("UIAlertView", alert.getText());
        alert.accept();
    }

    @Test
    public void testScroll() {
        //scroll menu
        //get initial third row location
        row = driver.findElements(By.tagName("tableCell")).get(2);
        Point location1 = row.getLocation();
        //perform swipe gesture
        TouchActions swipe = new TouchActions(driver).flick(0, -20);
        swipe.perform();
        //get new row coordinates
        Point location2 = row.getLocation();
        assertEquals(location1.getX(), location2.getX());
        assertNotSame(location1.getY(), location2.getY());
    }

    @Test
    public void testSlider() {
        //go to controls
        openMenuPosition(1);
        //get the slider
        WebElement slider = driver.findElement(By.tagName("slider"));
        assertEquals("50%", slider.getAttribute("value"));
        TouchActions drag = new TouchActions(driver).flick(slider, new Integer(-1), 0, 0);
        drag.perform();
        assertEquals("0%", slider.getAttribute("value"));
    }

    @Test
    public void testSessions() throws Exception {

        HttpGet request = new HttpGet("http://localhost:4723/wd/hub/sessions");
        HttpClient httpClient = new DefaultHttpClient();
        HttpResponse response = httpClient.execute(request);
        HttpEntity entity = response.getEntity();
        JSONObject jsonObject = (JSONObject) new JSONParser().parse(EntityUtils.toString(entity));

        String sessionId = ((RemoteWebDriver) driver).getSessionId().toString();
        assertEquals(jsonObject.get("sessionId"), sessionId);
    }

    @Test
    public void testSize() {
        Dimension table = driver.findElement(By.tagName("tableView")).getSize();
        Dimension cell = driver.findElements(By.tagName("tableCell")).get(0).getSize();
        assertEquals(table.getWidth(), cell.getWidth());
        assertNotSame(table.getHeight(), cell.getHeight());
    }

    @Test
    public void testSource() {
        //get main view soruce
        String source_main = driver.getPageSource();
        assertTrue(source_main.contains("UIATableView"));
        assertTrue(source_main.contains("TextFields, Uses of UITextField"));

        //got to text fields section
        openMenuPosition(2);
        String source_textfields = driver.getPageSource();
        assertTrue(source_textfields.contains("UIAStaticText"));
        assertTrue(source_textfields.contains("TextFields"));

        assertNotSame(source_main, source_textfields);
    }

    public class SwipeableWebDriver extends RemoteWebDriver implements HasTouchScreen {
        private RemoteTouchScreen touch;

        public SwipeableWebDriver(URL remoteAddress, Capabilities desiredCapabilities) {
            super(remoteAddress, desiredCapabilities);
            touch = new RemoteTouchScreen(getExecuteMethod());
        }

        public TouchScreen getTouch() {
            return touch;
        }
    }
}
