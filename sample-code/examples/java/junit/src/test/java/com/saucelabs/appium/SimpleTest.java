package com.saucelabs.appium;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;

import java.io.File;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import static org.junit.Assert.assertEquals;

/**
 * Simple <a href="https://github.com/appium/appium">Appium</a> test which runs against a local Appium instance deployed
 * with the 'TestApp' iPhone project which is included in the Appium source distribution.
 *
 * @author Ross Rowe
 */
public class SimpleTest {

    private WebDriver driver;

    private List<Integer> values;

    private static final int MINIMUM = 0;
    private static final int MAXIMUM = 10;

    @Before
    public void setUp() throws Exception {
        // set up appium
        File appDir = new File(System.getProperty("user.dir"), "../../../apps/TestApp/build/Release-iphonesimulator");
        File app = new File(appDir, "TestApp.app");
        DesiredCapabilities capabilities = new DesiredCapabilities();
        capabilities.setCapability(CapabilityType.BROWSER_NAME, "iOS");
        capabilities.setCapability(CapabilityType.VERSION, "6.0");
        capabilities.setCapability(CapabilityType.PLATFORM, "Mac");
        capabilities.setCapability("app", app.getAbsolutePath());
        driver = new RemoteWebDriver(new URL("http://127.0.0.1:4723/wd/hub"), capabilities);
        values = new ArrayList<Integer>();
    }

    @After
    public void tearDown() throws Exception {
        driver.quit();
    }

    @Test
    public void testUIComputation() throws Exception {
        // populate text fields with values
        populate();
        // trigger computation by using the button
        WebElement button = driver.findElement(By.tagName("button"));
        button.click();
        // is sum equal ?
        WebElement texts = driver.findElement(By.tagName("staticText"));
        assertEquals(texts.getText(), String.valueOf(values.get(0) + values.get(1)));
    }

    private void populate() {
        //populate text fields with two random number
        List<WebElement> elems = driver.findElements(By.tagName("textField"));
        Random random = new Random();
        for (WebElement elem : elems) {
            int rndNum = random.nextInt(MAXIMUM - MINIMUM + 1) + MINIMUM;
            elem.sendKeys(String.valueOf(rndNum));
            values.add(rndNum);
        }
    }
}
