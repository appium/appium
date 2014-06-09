package io.appium.android.bootstrap.handler;

import com.android.uiautomator.common.ReflectionUtils;
import com.android.uiautomator.core.UiObjectNotFoundException;
import io.appium.android.bootstrap.Logger;

import java.lang.reflect.Method;

/**
 * This handler is used to perform a touchUp event on an element in the Android
 * UI.
 * 
 */
public class TouchUp extends TouchEvent {

  @Override
  protected boolean executeTouchEvent() throws UiObjectNotFoundException {
    printEventDebugLine("TouchUp");
    try {
      final ReflectionUtils utils = new ReflectionUtils();
      final Method touchUp = utils.getControllerMethod("touchUp", int.class, int.class);
      return (Boolean) touchUp.invoke(utils.getController(), clickX, clickY);
    } catch (final Exception e) {
      Logger.debug("Problem invoking touchUp: " + e);
      return false;
    }
  }
}