package com.example;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

import org.openqa.selenium.remote.Command;
import org.openqa.selenium.remote.CommandInfo;
import org.openqa.selenium.remote.HttpCommandExecutor;
import org.openqa.selenium.remote.HttpVerb;
import org.openqa.selenium.remote.Response;
import org.openqa.selenium.remote.SessionId;

import com.qa.framework.utils.reporter.Reporter;

public class LocalWebDriver {
	
	//Set constants
    private HttpCommandExecutor executor = null;
    private URL baseURL = null;
    private final String INSTALLAPPCOMMAND = "INSTALL_APP";
    private final String UNINSTALLAPPCOMMAND = "UNINSTALL_APP";
    private final String ISAPPINSTALLEDCOMMAND = "IS_APP_INSTALLED";
	/**
	 * CONSTRUCTOR:
	 * 
	 * @param configurationFilePath the path to the file containing all the config values
	 * @throws MalformedURLException 
	 */
	public LocalWebDriver() {
		
		try {
			//set the base url for the executor.
			this.baseURL = new URL("http://127.0.0.1:4444/wd/hub");
		} catch (MalformedURLException e) {
			Reporter.error("Unable to create url [" + e.getMessage() + "]");
		}
		//configure the end points which we can call.
		Map<String, CommandInfo> additionalCommands = new HashMap<String, CommandInfo>();
		additionalCommands.put(INSTALLAPPCOMMAND, new CommandInfo("/app/install/", HttpVerb.POST));
		additionalCommands.put(ISAPPINSTALLEDCOMMAND, new CommandInfo("/app/installed/", HttpVerb.POST));
		additionalCommands.put(UNINSTALLAPPCOMMAND, new CommandInfo("/app/uninstall/", HttpVerb.POST));
		
		executor = new HttpCommandExecutor(additionalCommands, this.baseURL);
	}
	   
    /**
     * This method will use the appPath parameter to install the app on the attached 
     * iOS device. Please make sure the appPath is accessible by the appium server.
     * 
     * @param appPath to a local (zipped) app file or a url for a zipped app file. 
     */
    public void installApp(String appPath){
    	Map<String, String> parameters = new HashMap<String, String>();
    	parameters.put("appPath", appPath);
    	Command command = new Command(new SessionId(""), INSTALLAPPCOMMAND, parameters);
      	try {
			Response response = executor.execute(command);
			if(response.getStatus() == 0){
				Reporter.info(response.getValue().toString());
			} else {
				Reporter.error(response.getValue().toString());
			}
		} catch (IOException e) {
			Reporter.error("Unable to install app: " + e.getMessage());
		}
    }

    /**
     * This method will use the bundlId parameter to un-install the app from
     * the attached iOS device. 
     * 
     * @param bundleId of the app you would like to remove 
     * @return boolean it will return a true if the app was successfully un-installed and false 
     * 		if it could not found or if the un-install failed.
     */
    public boolean unInstallApp(String bundleId){
    	if (isAppInstalled(bundleId)){
	    	Map<String, String> parameters = new HashMap<String, String>();
	    	parameters.put("bundleId", bundleId);
	    	Command command = new Command(new SessionId(""), UNINSTALLAPPCOMMAND, parameters);
	      	try {
				Response response = executor.execute(command);
				if(response.getStatus() == 0){
					Reporter.info(response.getValue().toString());
					return true;
				} else {
					Reporter.info(response.getValue().toString());
				}
			} catch (IOException e) {
				Reporter.error("Unable to uninstall app: " + e.getMessage());
			}
    	}
		return false;
    }
    
    /**
     * This method will use the bundleId parameter to check if the app is 
     * installed on the attached iOS device
     * 
     * @param bundleId of the app you would like to check for
     * 
     * @return boolean true if the app is installed and false if its not.
     */
    public boolean isAppInstalled(String bundleId){
    	Map<String, String> parameters = new HashMap<String, String>();
    	parameters.put("bundleId", bundleId);
    	Command command = new Command(new SessionId(""), ISAPPINSTALLEDCOMMAND, parameters);
      	try {
			Response response = executor.execute(command);
			if(response.getValue().equals(true)){
				Reporter.info("Found the app with bundleID: " + bundleId);
				return true;
			} else {
				Reporter.info("No app found with bundleID: " + bundleId);
			}
		} catch (IOException e) {
			Reporter.error("Unable to check if app is installed: " + e.getMessage());
		}
		return false;
    }
}
