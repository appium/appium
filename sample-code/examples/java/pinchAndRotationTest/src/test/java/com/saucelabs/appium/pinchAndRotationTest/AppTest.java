package com.saucelabs.appium.pinchAndRotationTest;

import java.io.File;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;

import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;


public class AppTest {
	@SuppressWarnings("serial")
	public static void main(String[] args) {
		
		File classpathRoot = new File(System.getProperty("user.dir"));
        File appDir = new File(classpathRoot, "../../../apps/MonkeyPinch/build/Release-iphonesimulator");
        File app = new File(appDir, "MonkeyPinch.app");
		DesiredCapabilities capabilities = new DesiredCapabilities();
		capabilities.setCapability(CapabilityType.BROWSER_NAME, "iOS");
		capabilities.setCapability(CapabilityType.VERSION, "6.1");
		capabilities.setCapability(CapabilityType.PLATFORM, "Mac");
		capabilities.setCapability("app", app.getAbsolutePath());
		try {
			RemoteWebDriver driver = new RemoteWebDriver(new URL("http://127.0.0.1:4723/wd/hub"), capabilities);
			JavascriptExecutor js;
			js = (JavascriptExecutor)driver;
			
			//Mobile Command For Rotation
			js.executeScript("mobile: rotate", new HashMap<String, Double>() {{ put("x", (double)114); put("y", (double)198); put("radius", (double)5); put("touchCount", (double)2);  put("duration", 4.9697461);  put("rotation", 220.0); }});
			
			//Mobile Command For Pinch Open
			js.executeScript("mobile: pinchOpen", new HashMap<String, Double>() {{ put("startX", (double)114); put("startY", (double)198); put("endX", (double)257); put("endY", (double)256);  put("duration", 2.0); }});
			
			//Mobile Command For Pinch Close
			js.executeScript("mobile: pinchClose", new HashMap<String, Double>() {{ put("startX", (double)114); put("startY", (double)198); put("endX", (double)257); put("endY", (double)256);  put("duration", 2.0); }});
			
			
			driver.close();
			
		} catch (MalformedURLException e) {
			e.printStackTrace();
		}

	}
}
