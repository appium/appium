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
 * This handler is used to flick elements in the Android UI.
 * 
 * Based on the element Id, flick that element.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * 
 */
public class Flick extends CommandHandler {

  private Point calculateEndPoint(final Point start, final Integer xSpeed,
      final Integer ySpeed) {
    final UiDevice d = UiDevice.getInstance();
    final Point end = new Point();
    final double speedRatio = (double) xSpeed / ySpeed;
    double xOff;
    double yOff;

    final double value = Math.min(d.getDisplayHeight(), d.getDisplayWidth());

    if (speedRatio < 1) {
      yOff = value / 4;
      xOff = value / 4 * speedRatio;
    } else {
      xOff = value / 4;
      yOff = value / 4 / speedRatio;
    }

    xOff = Integer.signum(xSpeed) * xOff;
    yOff = Integer.signum(ySpeed) * yOff;

    end.x = start.x + xOff;
    end.y = start.y + yOff;
    return end;
  }

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
    Point start = new Point(0.5, 0.5);
    Point end = new Point();
    Double steps = null;

    final Hashtable<String, Object> params = command.params();
    final UiDevice d = UiDevice.getInstance();

    if (command.isElementCommand()) {
      AndroidElement el;
      try {
        el = command.getElement();
        start = el.getAbsolutePosition(start);
        final Integer xoffset = (Integer) params.get("xoffset");
        final Integer yoffset = (Integer) params.get("yoffset");
        final Integer speed = (Integer) params.get("speed");

        steps = 1250.0 / speed + 1;
        end.x = start.x + xoffset;
        end.y = start.y + yoffset;

      } catch (final ElementNotInHashException e) {
        return getErrorResult(e.getMessage());
      } catch (final UiObjectNotFoundException e) {
        return getErrorResult(e.getMessage());
      } catch (final InvalidCoordinatesException e) {
        return getErrorResult(e.getMessage());
      }
    } else {
      try {
        final Integer xSpeed = (Integer) params.get("xSpeed");
        final Integer ySpeed = (Integer) params.get("ySpeed");

        final Double speed = Math.min(1250.0,
            Math.sqrt(xSpeed * xSpeed + ySpeed * ySpeed));
        steps = 1250.0 / speed + 1;

        start = GetDeviceAbsPos(start);
        end = calculateEndPoint(start, xSpeed, ySpeed);
      } catch (final InvalidCoordinatesException e) {
        return getErrorResult(e.getMessage());
      }
    }

    steps = Math.abs(steps);
    Logger.info("Flicking from " + start.toString() + " to " + end.toString()
        + " with steps: " + steps.intValue());
    final boolean res = d.swipe(start.x.intValue(), start.y.intValue(),
        end.x.intValue(), end.y.intValue(), steps.intValue());

    if (res) {
      return getSuccessResult(res);
    } else {
      return getErrorResult("Flick did not complete successfully");
    }
  }
}
