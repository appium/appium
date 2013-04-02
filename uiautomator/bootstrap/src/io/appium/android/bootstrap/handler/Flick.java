/**
 * 
 */
package io.appium.android.bootstrap.handler;
import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;

import com.android.uiautomator.core.UiDevice;

/**
 * @author xuru
 *
 */
public class Flick extends CommandHandler {
	
	public Flick(AndroidCommand cmd) {
		super(cmd);
	}

	public AndroidCommandResult execute() {
		if (!this.command.isElementCommand()) {
	        Integer xSpeed = (Integer) params.get("xSpeed");
	        Integer ySpeed = (Integer) params.get("ySpeed");
	        
	        UiDevice d = UiDevice.getInstance();
	        
	        Integer screenX = d.getDisplayWidth();
	        Integer screenY = d.getDisplayHeight();
	        Integer startX = screenX / 2;
	        Integer startY = screenY / 2;
	        Double speedRatio = (double) xSpeed / ySpeed;
	        Integer xOff;
	        Integer yOff;
	        
	        if (speedRatio < 1) {
		        yOff = screenY / 4;
		        xOff = (int)((double) screenX / 4 * speedRatio);
	        } else {
		        xOff = screenX / 4;
		        yOff = (int)((double) screenY / 4 / speedRatio);
	        }
	        
	        Integer endX = startX + (Integer.signum(xSpeed) * xOff);
	        Integer endY = startY + (Integer.signum(ySpeed) * yOff);
	        Double speed = Math.max(1250, Math.sqrt((xSpeed*xSpeed)+(ySpeed*ySpeed)));
	        Integer steps = (1250 / speed.intValue()) + 1;
	        
	        boolean res = d.swipe(startX, startY, endX, endY, steps);
	 
	        if (res) {
		        return getSuccessResult(res);
	        } else {
		        return getErrorResult("Flick did not complete successfully");
	        }
		} else {
            return getErrorResult("Flick not yet implemented on the element level.");
		}
	}
}
