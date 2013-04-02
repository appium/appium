package io.appium.android.bootstrap;

import java.util.ArrayList;

import org.json.JSONException;

import com.android.uiautomator.core.UiDevice;

public class CommandHandler {

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

	public AndroidCommandResult execute(AndroidCommand command) throws JSONException {
		return null;
	}
}
