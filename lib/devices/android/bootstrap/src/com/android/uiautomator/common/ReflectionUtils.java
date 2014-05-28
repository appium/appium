package com.android.uiautomator.common;

import io.appium.android.bootstrap.Logger;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

import android.os.Build;

import com.android.uiautomator.core.UiDevice;

public class ReflectionUtils {
  private static Field enableField(final Class<?> clazz, final String field)
      throws SecurityException, NoSuchFieldException {
    Logger.debug("Updating class \"" + clazz + "\" to enable field \"" + field
        + "\"");
    final Field fieldObject = clazz.getDeclaredField(field);
    fieldObject.setAccessible(true);
    return fieldObject;
  }

  private Object controller = null;

  public ReflectionUtils() throws IllegalArgumentException,
      IllegalAccessException, SecurityException, NoSuchFieldException {
    final UiDevice device = UiDevice.getInstance();
    final Object bridge = enableField(device.getClass(), "mUiAutomationBridge")
        .get(device);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
      controller = enableField(bridge.getClass().getSuperclass(),
          "mInteractionController").get(bridge);
    } else {
      controller = enableField(bridge.getClass(), "mInteractionController")
          .get(bridge);
    }
  }

  /*
   * getAutomatorBridge is private so we access the bridge via reflection to use
   * the touchDown / touchUp / touchMove methods.
   */
  public Object getController() throws IllegalArgumentException,
      IllegalAccessException, SecurityException, NoSuchFieldException {
    return controller;
  }

  public Method getMethod(final String name, final Class<?>... parameterTypes)
      throws NoSuchMethodException, SecurityException {
    final Class<?> controllerClass = controller.getClass();

    Logger.debug("Finding methods on class: " + controllerClass);
    final Method method;
    method = controllerClass.getDeclaredMethod(name, parameterTypes);

    method.setAccessible(true);
    return method;
  }
}
