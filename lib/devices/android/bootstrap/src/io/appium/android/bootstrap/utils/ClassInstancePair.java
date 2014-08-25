package io.appium.android.bootstrap.utils;

import com.android.uiautomator.core.UiSelector;

/**
 * Simple class for holding a String 2-tuple. An android class, and instance number, used for finding elements by xpath.
 */
public class ClassInstancePair {

  private String androidClass;
  private String instance;

  public ClassInstancePair(String clazz, String inst) {
    androidClass = clazz;
    instance = inst;
  }

  public String getAndroidClass() {
    return androidClass;
  }

  public String getInstance() {
    return instance;
  }

  public UiSelector getSelector() {
    String androidClass = getAndroidClass();
    String instance = getInstance();

    return new UiSelector().className(androidClass).instance(Integer.parseInt(instance));
  }
}
