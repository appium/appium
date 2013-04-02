/**
 * 
 */
package io.appium.android.bootstrap.handler;
import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.exceptions.NoAttributeFoundException;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * @author xuru
 *
 */
public class GetAttribute extends CommandHandler {
	
	public GetAttribute(AndroidCommand cmd) {
		super(cmd);
	}
    
	public AndroidCommandResult execute() {
		if (this.command.isElementCommand()) {
			// only makes sense on an element
            try {
                String attr = params.get("attribute").toString();
                if (attr.equals("name") || attr.equals("text")) {
                    return getSuccessResult(el.getStringAttribute(attr));
                } else {
                    return getSuccessResult(el.getBoolAttribute(attr));
                }
            } catch (NoAttributeFoundException e) {
	            return getErrorResult(e.getMessage());
            } catch (UiObjectNotFoundException e) {
	            return getErrorResult(e.getMessage());
			}
		} else {
            return getErrorResult("Unable to get attribute without an element.");
		}
	}
}
