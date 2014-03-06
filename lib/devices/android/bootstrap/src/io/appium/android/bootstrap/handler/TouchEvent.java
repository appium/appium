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

import com.android.uiautomator.core.UiDevice;
import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is and abstract class that contains all the common code for
 * touch event handlers.
 * 
 */
public abstract class TouchEvent extends CommandHandler {
  private static Field enableField(final Class<?> clazz, final String field)
      throws SecurityException, NoSuchFieldException {
    Logger.debug("Updating class \"" + clazz + "\" to enable field \"" + field
        + "\"");
    final Field fieldObject = clazz.getDeclaredField(field);
    fieldObject.setAccessible(true);
    return fieldObject;
  }

  protected AndroidElement            el        = null;

  protected int                       clickX    = -1;

  protected int                       clickY    = -1;

  protected Hashtable<String, Object> params;

  protected boolean                   isElement = false;

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
      params = command.params();

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

  /*
   * getAutomatorBridge is private so we access the bridge via reflection to use
   * the touchDown / touchUp / touchMove methods.
   */
  protected Object getController() throws IllegalArgumentException,
      IllegalAccessException, SecurityException, NoSuchFieldException {
    final UiDevice device = UiDevice.getInstance();
    final Object bridge = enableField(device.getClass(), "mUiAutomationBridge")
        .get(device);
    final Object controller = enableField(bridge.getClass().getSuperclass(),
        "mInteractionController").get(bridge);
    return controller;

  }

  protected Method getMethod(final String name, final Object controller)
      throws NoSuchMethodException, SecurityException {
    final Class<?> controllerClass = controller.getClass();

    Logger.debug("Finding methods on class: " + controllerClass);
    final Method method = controllerClass.getDeclaredMethod(name, int.class,
        int.class);
    method.setAccessible(true);
    return method;
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
