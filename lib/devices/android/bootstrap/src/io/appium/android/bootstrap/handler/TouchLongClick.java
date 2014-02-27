package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.Logger;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Hashtable;

import org.json.JSONException;

import android.graphics.Rect;
import android.os.SystemClock;

import com.android.uiautomator.core.UiDevice;
import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to long click elements in the Android UI.
 * 
 */
public class TouchLongClick extends CommandHandler {

  private static Field enableField(final Class<?> clazz, final String field)
      throws SecurityException, NoSuchFieldException {
    Logger.debug("Updating class \"" + clazz + "\" to enable field \"" + field
        + "\"");
    final Field fieldObject = clazz.getDeclaredField(field);
    fieldObject.setAccessible(true);
    return fieldObject;
  }

  /*
   * UiAutomator has a broken longClick. getAutomatorBridge is private so we
   * access the bridge via reflection to use the touchDown / touchUp methods.
   */
  private boolean correctLongClick(final int x, final int y, final int duration) {
    try {
      /*
       * bridge.getClass() returns ShellUiAutomatorBridge on API 18/19 so use
       * the super class.
       */

      final UiDevice device = UiDevice.getInstance();
      final Object bridge = enableField(device.getClass(),
          "mUiAutomationBridge").get(device);
      final Object controller = enableField(bridge.getClass().getSuperclass(),
          "mInteractionController").get(bridge);
      final Class<?> controllerClass = controller.getClass();

      Logger.debug("Finding methods on class: " + controllerClass);
      final Method touchDown = controllerClass.getDeclaredMethod("touchDown",
          int.class, int.class);
      touchDown.setAccessible(true);
      final Method touchUp = controllerClass.getDeclaredMethod("touchUp",
          int.class, int.class);
      touchUp.setAccessible(true);

      if ((Boolean) touchDown.invoke(controller, x, y)) {
        SystemClock.sleep(duration);
        if ((Boolean) touchUp.invoke(controller, x, y)) {
          return true;
        }
      }
      return false;

    } catch (final Exception e) {
      Logger.debug("Problem invoking correct long click: " + e);
      return false;
    }
  }

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
    try {
      final Hashtable<String, Object> params = command.params();
      AndroidElement el = null;
      int clickX = -1;
      int clickY = -1;

      boolean isElement = false;
      // isElementCommand doesn't check to see if we actually have an element
      // so getElement is used instead.
      try {
        if (command.getElement() != null) {
          isElement = true;
        }
      } catch (final Exception e) {
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

      final Object paramDuration = params.get("duration");
      int duration = 2000; // two seconds
      if (paramDuration != null) {
        duration = Integer.parseInt(paramDuration.toString());
      }

      Logger.debug("longClick using element? " + isElement + " x: " + clickX
          + ", y: " + clickY + ", duration: " + duration);
      if (correctLongClick(clickX, clickY, duration)) {
        return getSuccessResult(true);
      }

      // if correctLongClick failed and we have an element
      // then uiautomator's longClick is used as a fallback.
      if (isElement) {
        Logger.debug("Falling back to broken longClick");

        final boolean res = el.longClick();
        return getSuccessResult(res);
      }
    } catch (final UiObjectNotFoundException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final ElementNotInHashException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final Exception e) {
      return getErrorResult(e.getMessage());
    }
    return getErrorResult("Failed to long click");
  }
}