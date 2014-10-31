package io.appium.android.bootstrap.handler;

import android.graphics.Rect;
import com.android.uiautomator.core.UiObjectNotFoundException;
import io.appium.android.bootstrap.*;
import io.appium.android.bootstrap.exceptions.InvalidCoordinatesException;
import io.appium.android.bootstrap.utils.Point;
import org.json.JSONException;

import java.util.ArrayList;
import java.util.Hashtable;

/**
 * This handler is and abstract class that contains all the common code for
 * touch event handlers.
 * 
 */
public abstract class TouchEvent extends CommandHandler {
  protected AndroidElement            el;

  protected int                       clickX;

  protected int                       clickY;

  protected Hashtable<String, Object> params;

  protected boolean                   isElement;

  /**
   * 
   * @param command
   *          The {@link AndroidCommand}
   * @return {@link AndroidCommandResult}
   * @throws JSONException
   * @see io.appium.android.bootstrap.CommandHandler#execute(io.appium.android.bootstrap.AndroidCommand)
   */
  @Override
  public AndroidCommandResult execute(final AndroidCommand command)
      throws JSONException {
    initalize();
    try {
      params = command.params();

      // isElementCommand doesn't check to see if we actually have an element
      // so getElement is used instead.
      try {
        if (command.getElement() != null) {
          isElement = true;
        }
      } catch (final Exception e) {
        isElement = false;
      }

      if (isElement) {
        // extract x and y from the element.
        el = command.getElement();

        // check if element exists without wait
        if(! el.exists()) {
          throw new UiObjectNotFoundException("TouchEvent element does not exist.");
        }

        final Rect bounds = el.getVisibleBounds();
        clickX = bounds.centerX();
        clickY = bounds.centerY();
      } else { // no element so extract x and y from params
        final Object paramX = params.get("x");
        final Object paramY = params.get("y");
        double targetX = 0;
        double targetY = 0;
        
        if (paramX != null) {
          targetX = Double.parseDouble(paramX.toString());
        }

        if (paramY != null) {
          targetY = Double.parseDouble(paramY.toString());
        }
        
        Point coords = new Point(targetX, targetY);
        coords = PositionHelper.getDeviceAbsPos(coords);
       
        clickX = coords.x.intValue();
        clickY = coords.y.intValue();
      }

      if (executeTouchEvent()) {
        return getSuccessResult(true);
      }

    } catch (final UiObjectNotFoundException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final InvalidCoordinatesException e) {
      return new AndroidCommandResult(WDStatus.INVALID_ELEMENT_COORDINATES, 
          e.getMessage());
    } catch (final Exception e) {
      return getErrorResult(e.getMessage());
    }
    return getErrorResult("Failed to execute touch event");
  }

  protected abstract boolean executeTouchEvent()
      throws UiObjectNotFoundException;

  /**
   * Variables persist across executions. initialize must be called at the start
   * of execute.
   **/
  private void initalize() {
    el = null;
    clickX = -1;
    clickY = -1;
    params = null;
    isElement = false;
  }

  protected void printEventDebugLine(final String methodName,
      final Integer... duration) {
    String extra = "";
    if (duration.length > 0) {
      extra = ", duration: " + duration[0];
    }
    Logger.debug("Performing " + methodName + " using element? " + isElement
        + " x: " + clickX + ", y: " + clickY + extra);
  }
}
