package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.Logger;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import java.util.Hashtable;

import org.json.JSONException;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to pinch in/out elements in the Android UI.
 * 
 * Based on the element Id, pinch in/out that element.
 * 
 */
public class Pinch extends CommandHandler {

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
    final Hashtable<String, Object> params = command.params();

    AndroidElement el;
    final String direction = params.get("direction").toString();
    final Integer percent = (Integer) params.get("percent");
    final Integer steps = (Integer) params.get("steps");
    try {
      el = command.getElement();
      if (el == null) {
        return getErrorResult("Could not find an element with elementId: "
            + (String) params.get("elementId"));
      }
    } catch (final ElementNotInHashException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final Exception e) { // JSONException, NullPointerException, etc.
      return getErrorResult("Unknown error:" + e.getMessage());
    }

    Logger.info("Pinching " + direction + " " + percent.toString() + "%"
        + " with steps: " + steps.toString());
    boolean res = false;
    if (direction.equals("in")) {
      try {
        res = el.pinchIn(percent, steps);
      } catch (final UiObjectNotFoundException e) {
        return getErrorResult("Selector could not be matched to any UI element displayed");
      }
    } else {
      try {
        res = el.pinchOut(percent, steps);
      } catch (final UiObjectNotFoundException e) {
        return getErrorResult("Selector could not be matched to any UI element displayed");
      }
    }

    if (res) {
      return getSuccessResult(res);
    } else {
      return getErrorResult("Pinch did not complete successfully");
    }
  }
}
