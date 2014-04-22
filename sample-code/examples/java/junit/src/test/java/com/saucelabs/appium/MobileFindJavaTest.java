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
    final String about_phone = scroll_to("about phone");
    if (about_phone != null) {
      System.out.println("scrolled to: aboutPhone");
      System.out.println("returned: " + about_phone);
    }

    scroll_to("bluetooth");
  }


  // @formatter:off
  /*
  This is a port of the following Ruby code from github.com/appium/ruby_lib
  The Selenium Java bindings make it impossible to post JSON so we're using
  HttpPost directly.

  # Scroll to an element containing target text or description.
  # @param text [String] the text to search for in the text value and content description
  # @return [Element] the element scrolled to
  def scroll_to text
    args = 'scroll',
        # textContains(text)
        [ [3, text] ],
        # descriptionContains(text)
        [ [7, text] ]

    mobile :find, args
  end
  */
  // @formatter:on
  public String scroll_to(String text) {

    text = text.replaceAll("\"", "\\\""); // quotes must be escaped.
    final String[] jsonString = {"\"scroll\"","[[3,\"" + text + "\"]]","[[7,\"" + text + "\"]]"};


    return driver.complexFind(jsonString);

  }

  @Before
  public void setUp() throws Exception {
    final DesiredCapabilities capabilities = new DesiredCapabilities();
    capabilities.setCapability("device", "android");
    capabilities.setCapability(CapabilityType.PLATFORM, "android");
    capabilities.setCapability("appPackage", "com.android.settings");
    capabilities.setCapability("appActivity", ".Settings");
    driver = new AppiumDriver(new URL(url), capabilities);
  }

  @After
  public void tearDown() throws Exception {
    driver.quit();
  }
}