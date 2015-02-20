package io.appium.android.bootstrap.utils;

import io.appium.android.bootstrap.Logger;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Arrays;

public class ReflectionUtils {

  /**
   * Clears the in-process Accessibility cache, removing any stale references.
   * Because the AccessibilityInteractionClient singleton stores copies of
   * AccessibilityNodeInfo instances, calls to public APIs such as `recycle` do
   * not guarantee cached references get updated. See the
   * android.view.accessibility AIC and ANI source code for more information.
   */
  public static boolean clearAccessibilityCache() {
    boolean success = false;

    try {
      final Class c = Class
          .forName("android.view.accessibility.AccessibilityInteractionClient");
      final Method getInstance = ReflectionUtils.method(c, "getInstance");
      final Object instance = getInstance.invoke(null);
      final Method clearCache = ReflectionUtils.method(instance.getClass(),
          "clearCache");
      clearCache.invoke(instance);
      success = true;
    } catch (final Exception ex) {
      // Expected: ClassNotFoundException, NoSuchMethodException,
      // IllegalAccessException,
      // InvocationTargetException, NoSuchFieldException
      Logger.error("Failed to clear Accessibility Node cache. "
          + ex.getMessage());
    }

    return success;
  }

  public static Class getClass(final String name) {
    try {
      return Class.forName(name);
    } catch (final ClassNotFoundException e) {
      final String msg = String.format("unable to find class %s", name);
      throw new RuntimeException(msg, e);
    }
  }

  public static Object getField(final Class clazz, final String fieldName,
      final Object object) {
    try {
      final Field field = clazz.getDeclaredField(fieldName);
      field.setAccessible(true);

      return field.get(object);
    } catch (final Exception e) {
      final String msg = String.format(
          "error while getting field %s from object %s", fieldName, object);
      Logger.error(msg + " " + e.getMessage());
      throw new RuntimeException(msg, e);
    }
  }

  public static Object getField(final String field, final Object object) {
    return getField(object.getClass(), field, object);
  }

  public static Object getField(final String className, final String field,
      final Object object) {
    return getField(getClass(className), field, object);
  }

  public static Object invoke(final Method method, final Object object,
      final Object... parameters) {
    try {
      return method.invoke(object, parameters);
    } catch (final Exception e) {
      final String msg = String.format(
          "error while invoking method %s on object %s with parameters %s",
          method, object, Arrays.toString(parameters));
      Logger.error(msg + " " + e.getMessage());
      throw new RuntimeException(msg, e);
    }
  }

  public static Method method(final Class clazz, final String methodName,
      final Class... parameterTypes) {
    try {
      final Method method = clazz.getDeclaredMethod(methodName, parameterTypes);
      method.setAccessible(true);

      return method;
    } catch (final Exception e) {
      final String msg = String
          .format(
              "error while getting method %s from class %s with parameter types %s",
              methodName, clazz, Arrays.toString(parameterTypes));
      Logger.error(msg + " " + e.getMessage());
      throw new RuntimeException(msg, e);
    }
  }

  public static Method method(final String className, final String method,
      final Class... parameterTypes) {
    return method(getClass(className), method, parameterTypes);
  }
}
