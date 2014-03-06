package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.Logger;

import java.lang.reflect.Method;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to perform a touchUp event on an element in the Android
 * UI.
 * 
 */
public class TouchUp extends TouchEvent {

  @Override
  protected boolean executeTouchEvent() throws UiObjectNotFoundException {
    Logger.debug("Performing touchUp using element? " + isElement + " x: "
        + clickX + ", y: " + clickY);
    try {
      final Object controller = getController();
      final Method touchUp = getMethod("touchUp", controller);
      return (Boolean) touchUp.invoke(controller, clickX, clickY);
    } catch (final Exception e) {
      Logger.debug("Problem invoking correct touchUp: " + e);
      return false;
    }
  }
}