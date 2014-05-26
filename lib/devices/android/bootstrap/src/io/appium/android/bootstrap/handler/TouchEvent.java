package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.Logger;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import java.util.ArrayList;
import java.util.Hashtable;

import org.json.JSONException;

import android.graphics.Rect;

import com.android.uiautomator.core.UiObjectNotFoundException;

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

        final Rect bounds = el.getVisibleBounds();
        clickX = bounds.centerX();
        clickY = bounds.centerY();
      } else { // no element so extract x and y from params
        final Object paramX = params.get("x");
        final Object paramY = params.get("y");
        double targetX = 0.5;
        double targetY = 0.5;
        if (paramX != null) {
          targetX = Double.parseDouble(paramX.toString());
        }

        if (paramY != null) {
          targetY = Double.parseDouble(paramY.toString());
        }

        final ArrayList<Integer> posVals = absPosFromCoords(new Double[] {
            targetX, targetY });
        clickX = posVals.get(0);
        clickY = posVals.get(1);
      }

      if (executeTouchEvent()) {
        return getSuccessResult(true);
      }

    } catch (final UiObjectNotFoundException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final ElementNotInHashException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
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
