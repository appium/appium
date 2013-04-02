/**
 * 
 */
package io.appium.android.bootstrap.handler;
import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;

import java.util.ArrayList;

import com.android.uiautomator.core.UiDevice;
import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * @author xuru
 *
 */
public class Click extends CommandHandler {
	
	public Click(AndroidCommand cmd) {
		super(cmd);
	}
    
	public AndroidCommandResult execute() {
		if (this.command.isElementCommand()) {
			try {
				boolean res = this.el.click();
	            return getSuccessResult(res);
			} catch (UiObjectNotFoundException e) {
	            return getErrorResult(e.getMessage());
			}
		} else {
            Double[] coords = {
	            Double.parseDouble(params.get("x").toString()),
	            Double.parseDouble(params.get("y").toString())
            };
            ArrayList<Integer> posVals = absPosFromCoords(coords);
            boolean res = UiDevice.getInstance().click(posVals.get(0), posVals.get(1));
            return getSuccessResult(res);
		}
	}
}
