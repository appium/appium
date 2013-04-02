/**
 * 
 */
package io.appium.android.bootstrap.handler;
import java.util.Hashtable;

import org.json.JSONException;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * @author xuru
 *
 */
public class SetText extends CommandHandler {
	
	public AndroidCommandResult execute(AndroidCommand command) throws JSONException {
		if (command.isElementCommand()) {
			// Only makes sense on an element
			try {
				Hashtable<String, Object> params = command.params();
				AndroidElement el = command.getElement();
				String text = params.get("text").toString();
				
				return getSuccessResult(el.setText(text));
			} catch (UiObjectNotFoundException e) {
				return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
			} catch (ElementNotInHashException e) {
				return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
			}
		} else {
            return getErrorResult("Unable to set text without an element.");
		}
	}
}
