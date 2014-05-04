package com.saucelabs.appium;

import java.net.URL;

import org.apache.http.HttpEntity;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.remote.RemoteWebElement;

import com.google.gson.JsonParser;

public class MobileFindJavaTest {

  private RemoteWebDriver         driver;
  private static final String     url    = "http://127.0.0.1:4723/wd/hub";
  private static final HttpClient client = HttpClients.createDefault();
  private static final JsonParser parser = new JsonParser();

  @Test
  public void apiDemo() throws Exception {
    final WebElement about_phone = scroll_to("about phone");
    if (about_phone != null) {
      System.out.println("scrolled to: " + about_phone.getText());
    }

    scroll_to("bluetooth");
  }

  /** Create a new remote web element. **/
  public RemoteWebElement newElement(final String elementId) {
    final RemoteWebElement element = new RemoteWebElement();
    element.setParent(driver);
    element.setId(elementId);
    element.setFileDetector(driver.getFileDetector());
    return element;
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
  public WebElement scroll_to(String text) {
    RemoteWebElement element = null;
    try {
      text = text.replaceAll("\"", "\\\""); // quotes must be escaped.
      final String jsonString = "{\"script\":\"mobile: find\",\"args\":[[\"scroll\",[[3,\""
          + text + "\"]],[[7,\"" + text + "\"]]]]}";
      final String id = driver.getSessionId().toString();
      final String executeURL = url + "/session/" + id + "/execute";

      final HttpPost post = new HttpPost(executeURL);
      post.setEntity(new StringEntity(jsonString, "UTF8"));
      post.setHeader("Content-type", "application/json");

      final HttpEntity responseEntity = client.execute(post).getEntity();

      if (responseEntity != null) {
        try {
          final String responseString = EntityUtils.toString(responseEntity);
          // {"status":0,"value":{"ELEMENT":"1"},"sessionId":"8e982755-980f-4036-b3d1-c0e14e890273"}
          final String elementId = parser.parse(responseString)
              .getAsJsonObject().get("value").getAsJsonObject().get("ELEMENT")
              .getAsString();

          element = newElement(elementId);
        } catch (final Exception e) {
          e.printStackTrace();
        } finally {
          EntityUtils.consume(responseEntity);
        }
      }
    } catch (final Exception e) {
      e.printStackTrace();
    }
    return element;
  }

  @Before
  public void setUp() throws Exception {
    final DesiredCapabilities capabilities = new DesiredCapabilities();
    capabilities.setCapability("device", "Android");
    capabilities.setCapability(CapabilityType.BROWSER_NAME, "");
    capabilities.setCapability(CapabilityType.VERSION, "4.2");
    capabilities.setCapability(CapabilityType.PLATFORM, "MAC");
    capabilities.setCapability("app-package", "com.android.settings");
    capabilities.setCapability("app-activity", ".Settings");
    driver = new RemoteWebDriver(new URL(url), capabilities);
  }

  @After
  public void tearDown() throws Exception {
    driver.quit();
  }
}