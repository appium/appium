package io.appium.android.bootstrap.handler;

import com.android.uiautomator.core.UiObjectNotFoundException;
import io.appium.android.bootstrap.*;
import io.appium.android.bootstrap.exceptions.NoAttributeFoundException;
import org.json.JSONException;

import java.util.Hashtable;

/**
 * This handler is used to get an attribute of an element.
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
        if (attr.equals("name") || attr.equals("text")
            || attr.equals("className") || attr.equals("resourceId")) {
          return getSuccessResult(el.getStringAttribute(attr));
        } else {
          return getSuccessResult(String.valueOf(el.getBoolAttribute(attr)));
        }
      } catch (final NoAttributeFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final UiObjectNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final Exception e) { // el is null
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      }
    } else {
      return getErrorResult("Unable to get attribute without an element.");
    }
  }
}
