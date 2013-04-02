package io.appium.android.bootstrap;

import io.appium.android.bootstrap.exceptions.AndroidCommandException;
import io.appium.android.bootstrap.handler.Click;
import io.appium.android.bootstrap.handler.Find;
import io.appium.android.bootstrap.handler.Flick;
import io.appium.android.bootstrap.handler.GetAttribute;
import io.appium.android.bootstrap.handler.GetDeviceSize;
import io.appium.android.bootstrap.handler.GetText;
import io.appium.android.bootstrap.handler.SetText;
import io.appium.android.bootstrap.handler.Swipe;

import org.json.JSONException;

class AndroidCommandExecutor {
    
    AndroidCommand command;
    
    public AndroidCommandExecutor(AndroidCommand cmd) {
        command = cmd;
    }
    
    public AndroidCommandResult execute() throws AndroidCommandException {
        
    	try {
	        Logger.debug("Got command action: " + command.action());
	        
			if (command.action() == "swipe") { 
				return new Swipe(this.command).execute(); 
			} else if (command.action().contentEquals("flick")) {
				return new Flick(this.command).execute(); 
			} else if (command.action().contentEquals("click")) {
				return new Click(this.command).execute(); 
			} else if (command.action().contentEquals("getText")) {
				return new GetText(this.command).execute(); 
			} else if (command.action().contentEquals("setText")) {
				return new SetText(this.command).execute(); 
			} else if (command.action().contentEquals("getAttribute")) {
				return new GetAttribute(this.command).execute(); 
			} else if (command.action().contentEquals("getDeviceSize")) {
				return new GetDeviceSize(this.command).execute(); 
			} else if (command.action().contentEquals("find")) {
				return new Find(this.command).execute(); 
			} else {
		        return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, 
		        		"Unknown command: " + command.action());
			}
		} catch (JSONException e) {
            Logger.error("Could not decode action/params of command");
            return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR,
            		"Could not decode action/params of command, please check format!");
		}
    }
}