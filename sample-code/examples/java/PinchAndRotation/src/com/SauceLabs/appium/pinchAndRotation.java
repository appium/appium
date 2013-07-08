package com.SauceLabs.appium;

import java.util.concurrent.TimeUnit;
import java.util.HashMap;
import java.io.File;
import java.net.MalformedURLException;
import java.net.URL;

import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.*;

public class pinchAndRotation {
	@SuppressWarnings("serial")
	public static void main(String[] args) {
		
		// set up appium
        File classpathRoot = new File(System.getProperty("user.dir"));
        File appDir = new File(classpathRoot, "../../../apps/MonkeyPinch/build/Release-iphonesimulator");
        File app = new File(appDir, "MonkeyPinch.app");
		DesiredCapabilities capabilities = new DesiredCapabilities();
		capabilities.setCapability(CapabilityType.BROWSER_NAME, "iOS");
		capabilities.setCapability(CapabilityType.VERSION, "6.1");
		capabilities.setCapability(CapabilityType.PLATFORM, "Mac");
		capabilities.setCapability("app", app.getAbsolutePath());
		RemoteWebDriver wd;
		try {
			wd = new RemoteWebDriver(new URL("http://127.0.0.1:4723/wd/hub"), capabilities);
			
			wd.manage().timeouts().implicitlyWait(60, TimeUnit.SECONDS);
			JavascriptExecutor js = (JavascriptExecutor)wd;	
			
			//Script for Pinch Open 
			js.executeScript("mobile: pinchOpen", new HashMap<String, Double>() {{ put("startX", (double)114); put("startY", (double)198); put("endX", (double)257); put("endY", (double)256);  put("duration", 4.9697461); }});
			
			//Script for Pinch Close
			js.executeScript("mobile: pinchClose", new HashMap<String, Double>() {{ put("startX", (double)114); put("startY", (double)198); put("endX", (double)257); put("endY", (double)256);  put("duration", 4.9697461); }});
			
			//Script for Rotation
			js.executeScript("mobile: rotate", new HashMap<String, Double>() {{ put("x", (double)114); put("y", (double)198); put("radius", (double)5); put("touchCount", (double)2);  put("duration", 20.0);  put("rotation", 100.0); }});
			wd.close();
			
		} catch (MalformedURLException e) {
			e.printStackTrace();
		}
		
	}
}
