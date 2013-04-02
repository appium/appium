/**
 * 
 */
package io.appium.android.bootstrap.handler;
import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;

import java.util.ArrayList;

import com.android.uiautomator.core.UiDevice;

/**
 * @author xuru
 *
 */
public class Swipe extends CommandHandler {
	
	public Swipe(AndroidCommand cmd) {
		super(cmd);
	}

	public AndroidCommandResult execute() {
        Double startX = Double.parseDouble(this.params.get("startX").toString());
        Double startY = Double.parseDouble(this.params.get("startY").toString());
        Double endX = Double.parseDouble(this.params.get("endX").toString());
        Double endY = Double.parseDouble(this.params.get("endY").toString());
        Integer steps = (Integer) this.params.get("steps");
 
		if (this.command.isElementCommand()) {
			// Can this command run on the element it's self?
			// swipe on an element is handled by 4 different commands: swipeDown, swipeLeft, swipeRight, and swipeUp
			// We have to figure out which to call and position it correctly...
		} else {
            UiDevice d = UiDevice.getInstance();
            Double[] coords = {startX, startY, endX, endY};
            ArrayList<Integer> posVals = absPosFromCoords(coords);
            boolean rv = d.swipe(posVals.get(0), posVals.get(1), posVals.get(2), posVals.get(3), steps);
            return getSuccessResult(rv);
		}
		
		return getErrorResult("Error in swiping...");
	}
}
