package io.appium.android.bootstrap.handler;

import com.android.uiautomator.core.UiObjectNotFoundException;
import io.appium.android.bootstrap.*;
import org.json.JSONException;

import java.util.Hashtable;

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
            + params.get("elementId"));
      }
    } catch (final Exception e) { // JSONException, NullPointerException, etc.
      return getErrorResult("Unknown error:" + e.getMessage());
    }

    Logger.debug("Pinching " + direction + " " + percent.toString() + "%"
        + " with steps: " + steps.toString());
    boolean res;
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
