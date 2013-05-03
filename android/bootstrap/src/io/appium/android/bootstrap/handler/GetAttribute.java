package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;
import io.appium.android.bootstrap.exceptions.NoAttributeFoundException;

import java.util.Hashtable;

import org.json.JSONException;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to get an attribute of an element.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * 
 */
public class GetAttribute extends CommandHandler {

  /*
   * @param command The {@link AndroidCommand} used for this handler.
   * 
   * @return {@link AndroidCommandResult}
   * 
   * @throws JSONException
   * 
   * @see io.appium.android.bootstrap.CommandHandler#execute(io.appium.android.
   * bootstrap.AndroidCommand)
   */
  @Override
  public AndroidCommandResult execute(final AndroidCommand command)
      throws JSONException {
    if (command.isElementCommand()) {
      // only makes sense on an element
      final Hashtable<String, Object> params = command.params();

      try {
        final AndroidElement el = command.getElement();
        final String attr = params.get("attribute").toString();
        if (attr.equals("name") || attr.equals("text")) {
          return getSuccessResult(el.getStringAttribute(attr));
        } else {
          return getSuccessResult(el.getBoolAttribute(attr));
        }
      } catch (final NoAttributeFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final UiObjectNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final ElementNotInHashException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      }
    } else {
      return getErrorResult("Unable to get attribute without an element.");
    }
  }
}
