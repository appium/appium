package io.appium.android.bootstrap.handler;

import android.graphics.Rect;
import com.android.uiautomator.core.UiObjectNotFoundException;
import io.appium.android.bootstrap.*;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * This handler is used to get the size of elements that support it.
 * 
 */
public class GetSize extends CommandHandler {

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
      // Only makes sense on an element
      final JSONObject res = new JSONObject();
      try {
        final AndroidElement el = command.getElement();
        final Rect rect = el.getBounds();
        res.put("width", rect.width());
        res.put("height", rect.height());
      } catch (final UiObjectNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final Exception e) { // handle NullPointerException
        return getErrorResult("Unknown error");
      }
      return getSuccessResult(res);
    } else {
      return getErrorResult("Unable to get text without an element.");
    }
  }
}
