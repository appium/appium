/**
 * 
 */
package io.appium.android.bootstrap.handler;
import org.json.JSONException;
import org.json.JSONObject;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import android.graphics.Rect;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * @author xuru
 *
 */
public class GetSize extends CommandHandler {
	
	public AndroidCommandResult execute(AndroidCommand command) throws JSONException {

		if (command.isElementCommand()) {
			// Only makes sense on an element
	        JSONObject res = new JSONObject();
			try {
				AndroidElement el = command.getElement();
				Rect rect = el.getBounds();
                res.put("width", rect.width());
                res.put("height", rect.height());
			} catch (UiObjectNotFoundException e) {
	            return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
			} catch (ElementNotInHashException e) {
	            return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
			}
            return getSuccessResult(res);
		} else {
            return getErrorResult("Unable to get text without an element.");
		}
	}
}
