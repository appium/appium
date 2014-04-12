package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.Logger;

import android.view.MotionEvent.PointerCoords;

import com.android.uiautomator.core.UiDevice;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

/**
 * This handler is and abstract class that contains all the common code for
 * touch event handlers.
 *
 */
public abstract class TouchableEvent extends CommandHandler {
  private static Field enableField(final Class<?> clazz, final String field)
      throws SecurityException, NoSuchFieldException {
    Logger.debug("Updating class \"" + clazz + "\" to enable field \"" + field
        + "\"");
    final Field fieldObject = clazz.getDeclaredField(field);
    fieldObject.setAccessible(true);
    return fieldObject;
  }

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
    final Method method;
    if (name.equals("performMultiPointerGesture")) {
      // multi pointer gestures take a 2d array of coordinates
      method = controllerClass.getDeclaredMethod(name, PointerCoords[][].class);
    } else {
      // all the other touch events send two ints
      method = controllerClass.getDeclaredMethod(name, int.class, int.class);
    }
    method.setAccessible(true);
    return method;
  }
}
