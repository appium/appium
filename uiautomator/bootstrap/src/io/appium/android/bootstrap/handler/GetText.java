/**
 * 
 */
package io.appium.android.bootstrap.handler;
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
public class GetText extends CommandHandler {
	
	public AndroidCommandResult execute(AndroidCommand command) throws JSONException {
		if (command.isElementCommand()) {
			// Only makes sense on an element
			try {
				AndroidElement el = command.getElement();
				return getSuccessResult(el.getText());
			} catch (UiObjectNotFoundException e) {
				return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
			} catch (ElementNotInHashException e) {
				return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
			}
		} else {
            return getErrorResult("Unable to get text without an element.");
		}
	}
}
