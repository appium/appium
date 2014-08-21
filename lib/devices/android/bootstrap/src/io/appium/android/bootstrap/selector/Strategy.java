package io.appium.android.bootstrap.selector;

import io.appium.android.bootstrap.exceptions.InvalidStrategyException;

/**
 * An emumeration of possible strategies.
 */
public enum Strategy {
  CLASS_NAME("class name"),
  CSS_SELECTOR("css selector"),
  ID("id"),
  NAME("name"),
  LINK_TEXT("link text"),
  PARTIAL_LINK_TEXT("partial link text"),
  XPATH("xpath"),
  ACCESSIBILITY_ID("accessibility id"),
  ANDROID_UIAUTOMATOR("-android uiautomator");

  public static Strategy fromString(final String text)
      throws InvalidStrategyException {
    if (text != null) {
      for (final Strategy s : Strategy.values()) {
        if (text.equalsIgnoreCase(s.strategyName)) {
          return s;
        }
      }
    }
    throw new InvalidStrategyException("Locator strategy '" + text
        + "' is not supported on Android");
  }

  private final String strategyName;

  private Strategy(final String name) {
    strategyName = name;
  }

  public String getStrategyName() {
    return strategyName;
  }
}