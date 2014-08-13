package io.appium.android.bootstrap.utils;

/**
 * Created by jonahss on 8/12/14.
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
}
