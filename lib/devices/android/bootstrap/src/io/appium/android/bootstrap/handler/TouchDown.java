package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.Logger;

import java.lang.reflect.Method;

import com.android.uiautomator.common.ReflectionUtils;
import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to perform a touchDown event on an element in the
 * Android UI.
 * 
 */
public class TouchDown extends TouchEvent {

  @Override
  protected boolean executeTouchEvent() throws UiObjectNotFoundException {
    printEventDebugLine("TouchDown");
    try {
      final ReflectionUtils utils = new ReflectionUtils();
      final Method touchDown = utils.getControllerMethod("touchDown", int.class,
          int.class);
      return (Boolean) touchDown.invoke(utils.getController(), clickX, clickY);
    } catch (final Exception e) {
      Logger.debug("Problem invoking touchDown: " + e);
      return false;
    }
  }
}