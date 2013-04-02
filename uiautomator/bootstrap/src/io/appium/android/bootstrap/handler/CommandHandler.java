package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.AndroidElementsHash;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import java.util.ArrayList;
import java.util.Hashtable;
import org.json.JSONException;
import com.android.uiautomator.core.UiDevice;

public class CommandHandler {
	AndroidElement el;
	AndroidCommand command;
	Hashtable<String, Object> params;	
	
	public CommandHandler(AndroidCommand cmd) {
		this.command = cmd;
        try {
			this.params = cmd.params();
		} catch (JSONException e1) {
			getErrorResult(e1.getMessage());
		}
        
        String elId = (String)params.get("elementId");
        try {
			this.el = AndroidElementsHash.getInstance().getElement(elId);
		} catch (ElementNotInHashException e) {
			getErrorResult(e.getMessage());
		}
	}

	protected AndroidCommandResult getSuccessResult(Object value) {
        return new AndroidCommandResult(WDStatus.SUCCESS, value);
    }
    
    protected AndroidCommandResult getErrorResult(String msg) {
        return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, msg);
    }

    protected static ArrayList<Integer> absPosFromCoords(Double[] coordVals) {
        ArrayList<Integer> retPos = new ArrayList<Integer>();
        UiDevice d = UiDevice.getInstance();
        
        Double screenX = new Double(d.getDisplayWidth());
        Double screenY = new Double(d.getDisplayHeight());
        
        if (coordVals[0] < 1 && coordVals[1] < 1) {
	        retPos.add((int)(screenX * coordVals[0]));
	        retPos.add((int)(screenY * coordVals[1]));
        } else {
	        retPos.add((coordVals[0]).intValue());
	        retPos.add((coordVals[1]).intValue());
        }
        
        return retPos;
    }
}
