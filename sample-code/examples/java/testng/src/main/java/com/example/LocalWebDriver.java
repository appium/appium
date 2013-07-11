package com.example;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

import org.apache.log4j.Logger;
import org.openqa.selenium.Platform;
import org.openqa.selenium.remote.Command;
import org.openqa.selenium.remote.CommandInfo;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.HttpCommandExecutor;
import org.openqa.selenium.remote.HttpVerb;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.remote.Response;
import org.openqa.selenium.WebDriverException;

public class LocalWebDriver  {
	
	//Set constants
	private HttpCommandExecutor executor = null;
	private DesiredCapabilities desired = null;
	private URL seleniumServerURL = null;
	private RemoteWebDriver remoteWebDriver = null;
	private Logger logger = Logger.getLogger("WEBDRIVER");
   
	/**
	 * Constructor:
	 * 
	 * When constructing the remotewebdriver we have to set launch to false.
	 */
	public LocalWebDriver(URL url, DesiredCapabilities desired){
		this.desired = desired;
		//setting the launch to false will stop appium from automatically launching the app.
		this.desired.setCapability("launch", false);
		this.remoteWebDriver = new RemoteWebDriver(url, this.desired);
	}
	
	
	/**
	 * This method will grab the app path from the config and install the app on the attached 
	 * iOS device. Please make sure the appPath is accessible by the appium server.
	 * 
	 * Please make sure to set the app path using the setApp method.
	 */
	public void installApp(){
		if (desired.getCapability("app") != null){
			this.installApp(desired.getCapability("app").toString());
		} else {
			logger.error("You have to supply the app parameter before calling the install app.");
		}
	}
            
	/**
	 * This method will use the appPath parameter to install the app on the attached 
	 * iOS device. Please make sure the appPath is accessible by the appium server.
	 * 
	 * @param appPath to a local (zipped) app file or a url for a zipped app file. 
	 */
	public void installApp(String appPath){
		try {
			Object result = remoteWebDriver.executeScript("mobile: installApp","{\"appPath\":\"" + appPath + "\"}");
			logger.info(result.toString());
		} catch (WebDriverException e) {
			logger.error(e.getMessage());
		}
	}
    
	/**
	 * This method will launch the app using mobile command
	 */
	public void launchApp(){
		try {
			Object result = remoteWebDriver.executeScript("mobile: launchApp");
			logger.info(result.toString());
		} catch (WebDriverException e) {
			logger.error(e.getMessage());
		}
	}
    
	/**
	 * This method will close the app using mobile command
	 */
	public void closeApp(){
		try {
			Object result = remoteWebDriver.executeScript("mobile: closeApp");
			logger.info(result.toString());
		} catch (WebDriverException e) {
			logger.error(e.getMessage());
		}
	}
	
	/**
	 * This method will use the bundlId parameter to un-install the app from
	 * the attached iOS device. 
	 * 
	 * @param bundleId of the app you would like to remove (e.g. com.gamesys.jackpotjoy)
	 */
	public void unInstallApp(String bundleId){
		try {
			Object result = remoteWebDriver.executeScript("mobile: removeApp","{\"bundleId\":\"" + bundleId + "\"}");
			logger.info(result.toString());
		} catch (WebDriverException e) {
			logger.error(e.getMessage());
		}
	}
    
	/**
	 * This method will use the bundleId parameter to check if the app is 
	 * installed on the attached iOS device
	 * 
	 * @param bundleId of the app you would like to check for (e.g. com.gamesys.jackpotjoy)
	 * 
	 * @return boolean true if the app is installed and false if its not.
	 */
	public boolean isAppInstalled(String bundleId){
		try {
			Object result = remoteWebDriver.executeScript("mobile: isAppInstalled","{\"bundleId\":\"" + bundleId + "\"}");
			if (result.toString().toLowerCase().equals("true")) {
				return true;
			} else if (result.toString().toLowerCase().equals("false")) {
				return false;
			} else {
				logger.info(result.toString());
				return false;
			}
		} catch (WebDriverException e) {
			logger.error(e.getMessage());
		}
		return false;
	}
}