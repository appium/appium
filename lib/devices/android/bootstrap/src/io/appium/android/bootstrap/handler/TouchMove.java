package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.Logger;

import java.lang.reflect.Method;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to perform a touchMove event on an element in the
 * Android UI.
 * 
 */
public class TouchMove extends TouchEvent {

  @Override
  protected boolean executeTouchEvent() throws UiObjectNotFoundException {
    printEventDebugLine("TouchMove");
    try {
      final Object controller = getController();
      final Method touchMove = getMethod("touchMove", controller);
      return (Boolean) touchMove.invoke(controller, clickX, clickY);
    } catch (final Exception e) {
      Logger.debug("Problem invoking touchMove: " + e);
      return false;
    }
  }
}