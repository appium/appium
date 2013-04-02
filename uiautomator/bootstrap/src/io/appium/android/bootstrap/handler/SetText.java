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
public class SetText extends CommandHandler {
	
	public SetText(AndroidCommand cmd) {
		super(cmd);
	}
    
	public AndroidCommandResult execute() {
		if (this.command.isElementCommand()) {
			// Only makes sense on an element
			try {
				String text = this.params.get("text").toString();
				return getSuccessResult(this.el.setText(text));
			} catch (UiObjectNotFoundException e) {
	            return getErrorResult("Unable to set text: " + e.getMessage());
			}
		} else {
            return getErrorResult("Unable to set text without an element.");
		}
	}
}
