package io.appium.android.bootstrap;

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
