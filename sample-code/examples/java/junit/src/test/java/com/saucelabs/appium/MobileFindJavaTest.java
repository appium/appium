package com.saucelabs.appium;

import com.google.gson.JsonParser;
import io.appium.java_client.AppiumDriver;
import org.apache.http.client.HttpClient;
import org.apache.http.impl.client.HttpClients;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.DesiredCapabilities;

import java.net.URL;

public class MobileFindJavaTest {

  private AppiumDriver            driver;
  private static final String     url    = "http://127.0.0.1:4723/wd/hub";
  private static final HttpClient client = HttpClients.createDefault();
  private static final JsonParser parser = new JsonParser();

  @Test
  public void apiDemo() throws Exception {
    driver.scrollTo("about phone");
    driver.scrollTo("bluetooth");
  }


  @Before
  public void setUp() throws Exception {
    final DesiredCapabilities capabilities = new DesiredCapabilities();
    capabilities.setCapability(CapabilityType.BROWSER_NAME, "");
    capabilities.setCapability("deviceName", "Android Emulator");
    capabilities.setCapability("platformName", "Android");
    capabilities.setCapability("appPackage", "com.android.settings");
    capabilities.setCapability("appActivity", ".Settings");
    driver = new AppiumDriver(new URL(url), capabilities);
  }

  @After
  public void tearDown() throws Exception {
    driver.quit();
  }
}