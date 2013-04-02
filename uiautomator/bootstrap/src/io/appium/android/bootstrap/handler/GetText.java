/**
 * 
 */
package io.appium.android.bootstrap.handler;
import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * @author xuru
 *
 */
public class GetText extends CommandHandler {
	
	public GetText(AndroidCommand cmd) {
		super(cmd);
	}
    
	public AndroidCommandResult execute() {
		if (this.command.isElementCommand()) {
			// Only makes sense on an element
			try {
				return getSuccessResult(this.el.getText());
			} catch (UiObjectNotFoundException e) {
	            return getErrorResult("Unable to get text: " + e.getMessage());
			}
		} else {
            return getErrorResult("Unable to get text without an element.");
		}
	}
}
