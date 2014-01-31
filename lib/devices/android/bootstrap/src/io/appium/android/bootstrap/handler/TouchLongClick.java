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
  private boolean correctLongClick(final int x, final int y) {
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
        SystemClock.sleep(2000);
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
    if (!command.isElementCommand()) {
      return getErrorResult("Unable to long click without an element.");
    }

    try {
      final AndroidElement el = command.getElement();

      final Rect bounds = el.getVisibleBounds();
      final int x = bounds.centerX();
      final int y = bounds.centerY();

      if (correctLongClick(x, y)) {
        return getSuccessResult(true);
      }

      Logger.debug("Falling back to broken longClick");

      final boolean res = el.longClick();
      return getSuccessResult(res);
    } catch (final UiObjectNotFoundException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final ElementNotInHashException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final Exception e) {
      return getErrorResult(e.getMessage());
    }
  }
}