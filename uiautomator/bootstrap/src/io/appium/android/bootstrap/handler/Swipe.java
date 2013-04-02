/**
 * 
 */
package io.appium.android.bootstrap.handler;
import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;

import java.util.ArrayList;
import java.util.Hashtable;

import org.json.JSONException;

import com.android.uiautomator.core.UiDevice;

/**
 * @author xuru
 *
 */
public class Swipe extends CommandHandler {
	
	public AndroidCommandResult execute(AndroidCommand command) throws JSONException {
		Hashtable<String, Object> params = command.params();
        Double startX = Double.parseDouble(params.get("startX").toString());
        Double startY = Double.parseDouble(params.get("startY").toString());
        Double endX = Double.parseDouble(params.get("endX").toString());
        Double endY = Double.parseDouble(params.get("endY").toString());
        Integer steps = (Integer) params.get("steps");
 
		if (command.isElementCommand()) {
			// Can this command run on the element it's self?
			// swipe on an element is handled by 4 different commands: swipeDown, swipeLeft, swipeRight, and swipeUp
			// We have to figure out which to call and position it correctly...
		} else {
            UiDevice device = UiDevice.getInstance();
            Double[] coords = {startX, startY, endX, endY};
            ArrayList<Integer> posVals = absPosFromCoords(coords);
            boolean rv = device.swipe(posVals.get(0), posVals.get(1), posVals.get(2), posVals.get(3), steps);
            return getSuccessResult(rv);
		}
		
		return getErrorResult("Error in swiping...");
	}
}
