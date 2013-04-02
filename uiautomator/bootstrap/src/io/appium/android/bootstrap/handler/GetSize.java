/**
 * 
 */
package io.appium.android.bootstrap.handler;
import org.json.JSONException;
import org.json.JSONObject;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;

import android.graphics.Rect;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * @author xuru
 *
 */
public class GetSize extends CommandHandler {
	
	public GetSize(AndroidCommand cmd) {
		super(cmd);
	}
    
	public AndroidCommandResult execute() {

		if (this.command.isElementCommand()) {
			// Only makes sense on an element
	        JSONObject res = new JSONObject();
			try {
				Rect rect = this.el.getBounds();
                res.put("width", rect.width());
                res.put("height", rect.height());
			} catch (UiObjectNotFoundException e) {
	            return getErrorResult("Unable to get bounds: " + e.getMessage());
			} catch (JSONException e) {
            	getErrorResult("Error serializing height/width data into JSON");
			}
            return getSuccessResult(res);
		} else {
            return getErrorResult("Unable to get text without an element.");
		}
	}
}
