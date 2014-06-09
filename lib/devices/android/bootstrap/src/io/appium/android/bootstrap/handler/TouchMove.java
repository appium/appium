package io.appium.android.bootstrap.handler;

import com.android.uiautomator.common.ReflectionUtils;
import com.android.uiautomator.core.UiObjectNotFoundException;
import io.appium.android.bootstrap.Logger;

import java.lang.reflect.Method;

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
      final ReflectionUtils utils = new ReflectionUtils();
      final Method touchMove = utils.getControllerMethod("touchMove", int.class,
          int.class);
      return (Boolean) touchMove.invoke(utils.getController(), clickX, clickY);
    } catch (final Exception e) {
      Logger.debug("Problem invoking touchMove: " + e);
      return false;
    }
  }
}