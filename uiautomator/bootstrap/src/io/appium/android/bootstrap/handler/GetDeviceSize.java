/**
 * 
 */
package io.appium.android.bootstrap.handler;
import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;

import org.json.JSONException;
import org.json.JSONObject;

import com.android.uiautomator.core.UiDevice;

/**
 * @author xuru
 *
 */
public class GetDeviceSize extends CommandHandler {
	
	public GetDeviceSize(AndroidCommand cmd) {
		super(cmd);
	}
    
	public AndroidCommandResult execute() {
		if (!this.command.isElementCommand()) {
			// only makes sense on a device
            UiDevice d = UiDevice.getInstance();
            JSONObject res = new JSONObject();
            try {
                res.put("width", d.getDisplayHeight());
                res.put("height", d.getDisplayWidth());
            } catch (JSONException e) {
            	getErrorResult("Error serializing height/width data into JSON");
            }
            return getSuccessResult(res);
		} else {
            return getErrorResult("Unable to get attribute without an element.");
		}
	}
}
