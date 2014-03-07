package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.Logger;

import java.lang.reflect.Method;

import android.os.SystemClock;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to long click elements in the Android UI.
 * 
 */
public class TouchLongClick extends TouchEvent {
  /*
   * UiAutomator has a broken longClick, so we'll try to implement it using the
   * touchDown / touchUp events.
   */
  private boolean correctLongClick(final int x, final int y, final int duration) {
    try {
      /*
       * bridge.getClass() returns ShellUiAutomatorBridge on API 18/19 so use
       * the super class.
       */

      final Object controller = getController();
      final Method touchDown = getMethod("touchDown", controller);
      final Method touchUp = getMethod("touchUp", controller);

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

  @Override
  protected boolean executeTouchEvent() throws UiObjectNotFoundException {
    final Object paramDuration = params.get("duration");
    int duration = 2000; // two seconds
    if (paramDuration != null) {
      duration = Integer.parseInt(paramDuration.toString());
    }

    printEventDebugLine("TouchLongClick", duration);
    if (correctLongClick(clickX, clickY, duration)) {
      return true;
    }
    // if correctLongClick failed and we have an element
    // then uiautomator's longClick is used as a fallback.
    if (isElement) {
      Logger.debug("Falling back to broken longClick");

      return el.longClick();
    }
    return false;
  }
}