package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.Logger;

import java.lang.reflect.Method;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to perform a touchDown event on an element in the
 * Android UI.
 * 
 */
public class TouchDown extends TouchEvent {

  @Override
  protected boolean executeTouchEvent() throws UiObjectNotFoundException {
    Logger.debug("Performing touchDown using element? " + isElement + " x: "
        + clickX + ", y: " + clickY);
    try {
      final Object controller = getController();
      final Method touchDown = getMethod("touchDown", controller);
      return (Boolean) touchDown.invoke(controller, clickX, clickY);
    } catch (final Exception e) {
      Logger.debug("Problem invoking correct touchDown: " + e);
      return false;
    }
  }
}