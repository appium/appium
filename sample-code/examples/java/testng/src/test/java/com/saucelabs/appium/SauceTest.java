package com.saucelabs.appium;


import com.saucelabs.common.SauceOnDemandAuthentication;
import com.saucelabs.common.SauceOnDemandSessionIdProvider;
import com.saucelabs.testng.SauceOnDemandAuthenticationProvider;
import com.saucelabs.testng.SauceOnDemandTestListener;
import org.apache.commons.lang.StringUtils;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Listeners;
import org.testng.annotations.Test;

import java.net.URL;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import static org.junit.Assert.assertEquals;

/**
 * Simple test which demonstrates how to run an <a href="https://github.com/appium/appium">Appium</a>
  * using <a href="http://saucelabs.com">Sauce Labs</a>.
  * <p/>
  * The test relies on SAUCE_USER_NAME and SAUCE_ACCESS_KEY environment variables being set which reference
  * the Sauce username/access key.
 *
 * @author Ross Rowe
 */
@Listeners({SauceOnDemandTestListener.class})
public class SauceTest implements SauceOnDemandSessionIdProvider, SauceOnDemandAuthenticationProvider {

    private WebDriver driver;

    private List<Integer> values;

    public SauceOnDemandAuthentication authentication;

    private static final int MINIMUM = 0;
    private static final int MAXIMUM = 10;
    private String sessionId;

    /**
     * Sets up appium.  You will need to either explictly set the sauce username/access key variables, or set
     * SAUCE_USER_NAME or SAUCE_USER_NAME environment variables to reference your Sauce account details.
     *
     * @throws Exception
     */
    @BeforeMethod
    public void setUp() throws Exception {
        // set up appium
        String username = System.getenv("SAUCE_USER_NAME");
        String key = System.getenv("SAUCE_ACCESS_KEY");
        if (StringUtils.isNotEmpty(username) && StringUtils.isNotEmpty(key)) {
           authentication = new SauceOnDemandAuthentication(username, key);
        } else {
           authentication = new SauceOnDemandAuthentication();
        }

        DesiredCapabilities capabilities = new DesiredCapabilities();
        capabilities.setCapability(CapabilityType.BROWSER_NAME, "iOS 6.0");
        capabilities.setCapability("device", "iPhone Simulator");
        capabilities.setCapability(CapabilityType.PLATFORM, "Mac 10.8");
        capabilities.setCapability("app", "http://appium.s3.amazonaws.com/TestApp6.0.app.zip");

        driver = new RemoteWebDriver(new URL(MessageFormat.format("http://{0}:{1}@ondemand.saucelabs.com:80/wd/hub", authentication.getUsername(), authentication.getAccessKey())),
                capabilities);
        sessionId = ((RemoteWebDriver)driver).getSessionId().toString();
        values = new ArrayList<Integer>();
    }

    /**
     * {@inheritDoc}
     * @return
     */
    @Override
    public String getSessionId() {
        return sessionId;
    }

    @AfterMethod
    public void tearDown() throws Exception {
        driver.quit();
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

    /**
     * {@inheritDoc}
     * @return
     */
    @Override
    public SauceOnDemandAuthentication getAuthentication() {
        return authentication;
    }
}
