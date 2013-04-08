package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.Logger;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;
import io.appium.android.bootstrap.exceptions.InvalidCoordinatesException;
import io.appium.android.bootstrap.utils.Point;

import java.util.Hashtable;

import org.json.JSONException;

import com.android.uiautomator.core.UiDevice;
import com.android.uiautomator.core.UiObjectNotFoundException;

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
      } catch (final ElementNotInHashException e) {
        return getErrorResult(e.getMessage());
      } catch (final UiObjectNotFoundException e) {
        return getErrorResult(e.getMessage());
      } catch (final InvalidCoordinatesException e) {
        return getErrorResult(e.getMessage());
      }
    } else {
      try {
        absStartPos = GetDeviceAbsPos(start);
        absEndPos = GetDeviceAbsPos(end);
      } catch (final InvalidCoordinatesException e) {
        return getErrorResult(e.getMessage());
      }
    }

    Logger.info("Swiping from " + absStartPos.toString() + " to "
        + absEndPos.toString() + " with steps: " + steps.toString());
    final boolean rv = device.swipe(absStartPos.x.intValue(),
        absStartPos.y.intValue(), absEndPos.x.intValue(),
        absEndPos.y.intValue(), steps);
    return getSuccessResult(rv);
  }
}
