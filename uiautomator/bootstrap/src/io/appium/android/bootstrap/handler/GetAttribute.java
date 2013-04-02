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
import io.appium.android.bootstrap.exceptions.NoAttributeFoundException;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * @author xuru
 *
 */
public class GetAttribute extends CommandHandler {
	
	public AndroidCommandResult execute(AndroidCommand command) throws JSONException {
		if (command.isElementCommand()) {
			// only makes sense on an element
			Hashtable<String, Object> params = command.params();

            try {
            	AndroidElement el = command.getElement();
                String attr = params.get("attribute").toString();
                if (attr.equals("name") || attr.equals("text")) {
                    return getSuccessResult(el.getStringAttribute(attr));
                } else {
                    return getSuccessResult(el.getBoolAttribute(attr));
                }
            } catch (NoAttributeFoundException e) {
            	return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
            } catch (UiObjectNotFoundException e) {
            	return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
			} catch (ElementNotInHashException e) {
				return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
			}
		} else {
            return getErrorResult("Unable to get attribute without an element.");
		}
	}
}
