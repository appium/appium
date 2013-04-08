package io.appium.android.bootstrap;

import io.appium.android.bootstrap.exceptions.InvalidCoordinatesException;
import io.appium.android.bootstrap.utils.Point;

import java.util.ArrayList;

import org.json.JSONException;

import com.android.uiautomator.core.UiDevice;

/**
 * Base class for all handlers.
 * 
 */
public abstract class CommandHandler {

  /**
   * Given a position, it will return either the position based on percentage
   * (by passing in a double between 0 and 1) or absolute position based on the
   * coordinates entered.
   * 
   * @param coordVals
   * @return ArrayList<Integer>
   */
  protected static ArrayList<Integer> absPosFromCoords(final Double[] coordVals) {
    final ArrayList<Integer> retPos = new ArrayList<Integer>();
    final UiDevice d = UiDevice.getInstance();

    final Double screenX = new Double(d.getDisplayWidth());
    final Double screenY = new Double(d.getDisplayHeight());

    if (coordVals[0] < 1 && coordVals[1] < 1) {
      retPos.add((int) (screenX * coordVals[0]));
      retPos.add((int) (screenY * coordVals[1]));
    } else {
      retPos.add(coordVals[0].intValue());
      retPos.add(coordVals[1].intValue());
    }

    return retPos;
  }

  protected static Point GetDeviceAbsPos(final Point point)
      throws InvalidCoordinatesException {
    final UiDevice d = UiDevice.getInstance();
    final Point retPos = new Point(point); // copy inputed point

    final Double width = new Double(d.getDisplayWidth());
    if (point.x < 1) {
      retPos.x = width * point.x;
    }

    if (retPos.x > width || retPos.x < 0) {
      throw new InvalidCoordinatesException("X coordinate ("
          + retPos.x.toString() + " is outside of screen width: "
          + width.toString());
    }

    final Double height = new Double(d.getDisplayHeight());
    if (point.y < 1) {
      retPos.y = height * point.y;
    }

    if (retPos.y > height || retPos.y < 0) {
      throw new InvalidCoordinatesException("Y coordinate ("
          + retPos.y.toString() + " is outside of screen height: "
          + height.toString());
    }

    return retPos;
  }

  /**
   * Abstract method that handlers must implement.
   * 
   * @param command
   *          A {@link AndroidCommand}
   * @return {@link AndroidCommandResult}
   * @throws JSONException
   */
  public abstract AndroidCommandResult execute(final AndroidCommand command)
      throws JSONException;

  /**
   * Returns a generic unknown error message along with your own message.
   * 
   * @param msg
   * @return {@link AndroidCommandResult}
   */
  protected AndroidCommandResult getErrorResult(final String msg) {
    return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, msg);
  }

  /**
   * Returns success along with the payload.
   * 
   * @param value
   * @return {@link AndroidCommandResult}
   */
  protected AndroidCommandResult getSuccessResult(final Object value) {
    return new AndroidCommandResult(WDStatus.SUCCESS, value);
  }
}
