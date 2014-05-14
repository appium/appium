package com.saucelabs.appium;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;

import java.net.URL;

import static org.junit.Assert.*;

/**
 *
 * Simple test which demonstrates how a test can be run against Mobile Safari running on an Appium instance.
 *
 * The test is based on https://github.com/appium/appium/blob/master/sample-code/examples/node/safari.js
 *
 * @author Ross Rowe
 */
public class SafariTest {

    private WebDriver driver;

    /**
     * Instantiates the {@link #driver} instance by using DesiredCapabilities which specify the
     * 'iPhone Simulator' device and 'safari' app.
     * @throws Exception
     */
    @Before
    public void setUp() throws Exception {
        DesiredCapabilities capabilities = new DesiredCapabilities();
        capabilities.setCapability("deviceName", "iPhone Simulator");
        capabilities.setCapability("platformName", "iOS");
        capabilities.setCapability("platformVersion", "7.1");
        capabilities.setCapability("browserName", "safari");
        driver = new RemoteWebDriver(new URL("http://127.0.0.1:4723/wd/hub"),
                capabilities);
        //driver.manage().timeouts().implicitlyWait(30, TimeUnit.SECONDS);
    }

    /**
     * Navigates to http://saucelabs.com/test/guinea-pig and interacts with the browser.
     *
     * @throws Exception
     */
    @Test
    public void runTest() throws Exception {
        driver.get("http://saucelabs.com/test/guinea-pig");
        Thread.sleep(1000);
        WebElement idElement = driver.findElement(By.id("i_am_an_id"));
        assertNotNull(idElement);
        assertEquals("I am a div", idElement.getText());
        WebElement commentElement = driver.findElement(By.id("comments"));
        assertNotNull(commentElement);
        commentElement.sendKeys("This is an awesome comment");
        WebElement submitElement = driver.findElement(By.id("submit"));
        assertNotNull(submitElement);
        submitElement.click();
        Thread.sleep(7000);
        WebElement yourCommentsElement = driver.findElement(By.id("your_comments"));
        assertNotNull(yourCommentsElement);
        assertTrue(driver.findElement(By.id("your_comments")).getText().contains("This is an awesome comment"));

      System.out.println(driver.getCurrentUrl());
    }

    /**
     * Closes the {@link #driver} instance.
     *
     * @throws Exception
     */
    @After
    public void tearDown() throws Exception {
        driver.quit();
    }
}
