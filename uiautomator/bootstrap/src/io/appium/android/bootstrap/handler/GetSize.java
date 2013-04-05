package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import org.json.JSONException;
import org.json.JSONObject;

import android.graphics.Rect;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to get the size of elements that support it.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
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
      } catch (final ElementNotInHashException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      }
      return getSuccessResult(res);
    } else {
      return getErrorResult("Unable to get text without an element.");
    }
  }
}
