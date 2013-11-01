package com.saucelabs.appium;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.openqa.selenium.*;
import org.openqa.selenium.interactions.HasTouchScreen;
import org.openqa.selenium.interactions.TouchScreen;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteTouchScreen;
import org.openqa.selenium.remote.RemoteWebDriver;
import java.io.File;
import java.net.URL;

public class AndroidWebViewTest {
    private WebDriver driver;

    @Before
    public void setUp() throws Exception {
        // set up appium
        File classpathRoot = new File(System.getProperty("user.dir"));
        File appDir = new File(classpathRoot, "../../../apps/WebViewDemo/target");
        String file = getApkFile(appDir);
        File app = new File(appDir, file);
        DesiredCapabilities capabilities = new DesiredCapabilities();
        capabilities.setCapability("device","selendroid");
        capabilities.setCapability("app", app.getAbsolutePath());
        capabilities.setCapability("app-package", "io.selendroid.testapp");
        capabilities.setCapability("app-activity", ".HomeScreenActivity");
        driver = new SwipeableWebDriver(new URL("http://127.0.0.1:4723/wd/hub"), capabilities);
    }
    private String getApkFile(File appDir) {

        for(String s : appDir.list())
            if(s.contains(".apk")){
                return s;
            }
        return "";
    }
    @After
    public void tearDown() throws Exception {
        driver.quit();
    }

    @Test
    public void webView(){
        WebElement button = driver.findElement(By.id("buttonStartWebview"));
        button.click();
        driver.switchTo().window("WEBVIEW");
        WebElement inputField = driver.findElement(By.id("name_input"));
        inputField.sendKeys("Some name");
        inputField.submit();
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
