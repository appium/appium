package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;

import java.util.ArrayList;
import java.util.Hashtable;

import org.json.JSONException;

import com.android.uiautomator.core.UiDevice;

/**
 * This handler is used to swipe.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * 
 */
public class Swipe extends CommandHandler {

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
    final Double startX = Double.parseDouble(params.get("startX").toString());
    final Double startY = Double.parseDouble(params.get("startY").toString());
    final Double endX = Double.parseDouble(params.get("endX").toString());
    final Double endY = Double.parseDouble(params.get("endY").toString());
    final Integer steps = (Integer) params.get("steps");

    if (command.isElementCommand()) {
      // Can this command run on the element it's self?
      // swipe on an element is handled by 4 different commands:
      // swipeDown, swipeLeft, swipeRight, and swipeUp
      // We have to figure out which to call and position it correctly...
    } else {
      final UiDevice device = UiDevice.getInstance();
      final Double[] coords = { startX, startY, endX, endY };
      final ArrayList<Integer> posVals = absPosFromCoords(coords);
      final boolean rv = device.swipe(posVals.get(0), posVals.get(1),
          posVals.get(2), posVals.get(3), steps);
      return getSuccessResult(rv);
    }

    return getErrorResult("Error in swiping...");
  }
}
