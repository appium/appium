/**
 * 
 */
package io.appium.android.bootstrap.handler;
import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import java.util.ArrayList;
import java.util.Hashtable;

import org.json.JSONException;

import com.android.uiautomator.core.UiDevice;
import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * @author xuru
 *
 */
public class Click extends CommandHandler {
	
	public AndroidCommandResult execute(AndroidCommand command) throws JSONException {
		if (command.isElementCommand()) {
			try {
				AndroidElement el = command.getElement();
				boolean res = el.click();
	            return getSuccessResult(res);
			} catch (UiObjectNotFoundException e) {
	            return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
			} catch (ElementNotInHashException e) {
	            return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
			}
		} else {
			Hashtable<String, Object> params = command.params();
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
