package io.appium.android.bootstrap.handler;

import com.android.uiautomator.core.UiDevice;
import com.android.uiautomator.core.UiObjectNotFoundException;
import io.appium.android.bootstrap.*;
import io.appium.android.bootstrap.exceptions.InvalidCoordinatesException;
import io.appium.android.bootstrap.utils.Point;
import org.json.JSONException;

import java.util.Hashtable;

/**
 * This handler is used to swipe.
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
    final Point start = new Point(params.get("startX"), params.get("startY"));
    final Point end = new Point(params.get("endX"), params.get("endY"));
    final Integer steps = (Integer) params.get("steps");
    final UiDevice device = UiDevice.getInstance();

    Point absStartPos = new Point();
    Point absEndPos = new Point();

    if (command.isElementCommand()) {
      try {
        final AndroidElement el = command.getElement();
        absStartPos = el.getAbsolutePosition(start);
        absEndPos = el.getAbsolutePosition(end, false);
      } catch (final UiObjectNotFoundException e) {
        return getErrorResult(e.getMessage());
      } catch (final InvalidCoordinatesException e) {
        return getErrorResult(e.getMessage());
      } catch (final Exception e) { // handle NullPointerException
        return getErrorResult("Unknown error");
      }
    } else {
      try {
        absStartPos = getDeviceAbsPos(start);
        absEndPos = getDeviceAbsPos(end);
      } catch (final InvalidCoordinatesException e) {
        return getErrorResult(e.getMessage());
      }
    }

    Logger.info("Swiping from " + absStartPos.toString() + " to "
        + absEndPos.toString() + " with steps: " + steps.toString());
    final boolean rv = device.swipe(absStartPos.x.intValue(),
        absStartPos.y.intValue(), absEndPos.x.intValue(),
        absEndPos.y.intValue(), steps);
    if (!rv) {
      return getErrorResult("The swipe did not complete successfully");
    }
    return getSuccessResult(rv);
  }
}
