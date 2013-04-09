package io.appium.android.bootstrap;

import org.json.JSONArray;
import org.json.JSONException;

import com.android.uiautomator.core.UiSelector;

// Constants from
// https://android.googlesource.com/platform/frameworks/testing/+/master/uiautomator/library/src/com/android/uiautomator/core/UiSelector.java
public class Dynamic {
  // static final int SELECTOR_NIL = 0; // nothing.
  /** text(String text) */
  private static final int SELECTOR_TEXT                 = 1;
  /** textStartsWith(String text) */
  private static final int SELECTOR_START_TEXT           = 2;
  /** textContains(String text) */
  private static final int SELECTOR_CONTAINS_TEXT        = 3;
  /** className(String className), className(Class<T> type) */
  private static final int SELECTOR_CLASS                = 4;
  /** description(String desc) */
  private static final int SELECTOR_DESCRIPTION          = 5;
  /** descriptionStartsWith(String desc) */
  private static final int SELECTOR_START_DESCRIPTION    = 6;
  /** descriptionContains(String desc) */
  private static final int SELECTOR_CONTAINS_DESCRIPTION = 7;
  /** index(final int index) */
  private static final int SELECTOR_INDEX                = 8;
  /** instance(final int instance) */
  private static final int SELECTOR_INSTANCE             = 9;
  /** enabled(boolean val) */
  private static final int SELECTOR_ENABLED              = 10;
  /** focused(boolean val) */
  private static final int SELECTOR_FOCUSED              = 11;
  /** focusable(boolean val) */
  private static final int SELECTOR_FOCUSABLE            = 12;
  /** scrollable(boolean val) */
  private static final int SELECTOR_SCROLLABLE           = 13;
  /** clickable(boolean val) */
  private static final int SELECTOR_CLICKABLE            = 14;
  /** checked(boolean val) */
  private static final int SELECTOR_CHECKED              = 15;
  /** selected(boolean val) */
  private static final int SELECTOR_SELECTED             = 16;
  // static final int SELECTOR_ID = 17; // nothing.
  /** packageName(String name) */
  private static final int SELECTOR_PACKAGE_NAME         = 18;
  // @formatter:off
// private  static final int SELECTOR_CHILD              = 19; // childSelector(UiSelector selector)
// private  static final int SELECTOR_CONTAINER          = 20; // containerSelector(UiSelector selector)
// private  static final int SELECTOR_PATTERN            = 21; // ! private ! patternSelector(UiSelector selector)
// private  static final int SELECTOR_PARENT             = 22; // fromParent(UiSelector selector)
// private  static final int SELECTOR_COUNT              = 23; // nothing.
  // @formatter:on
  /** longClickable(boolean val) */
  private static final int SELECTOR_LONG_CLICKABLE       = 24;
  /** textMatches(String regex) */
  private static final int SELECTOR_TEXT_REGEX           = 25;
  /** classNameMatches(String regex) */
  private static final int SELECTOR_CLASS_REGEX          = 26;
  /** descriptionMatches(String regex) */
  private static final int SELECTOR_DESCRIPTION_REGEX    = 27;
  /** packageNameMatches(String regex) */
  private static final int SELECTOR_PACKAGE_NAME_REGEX   = 28;

  private UiSelector       s                             = new UiSelector();

  public UiSelector get(final JSONArray array) throws JSONException {
    // Reset selector.
    s = new UiSelector();
    // Example pair.
    // Find everything containing the text sign.
    // [ [3, 'sign'] ]
    for (int a = 0; a < array.length(); a++) {
      final JSONArray pair = array.getJSONArray(a);
      update(pair.getInt(0), pair.get(1));
    }

    return s;
  }

  private void update(final int method, final Object param) {
    switch (method) {
      case SELECTOR_TEXT:
        s = s.text((String) param);
        break;
      case SELECTOR_START_TEXT:
        s = s.textStartsWith((String) param);
        break;
      case SELECTOR_CONTAINS_TEXT:
        s = s.textContains((String) param);
        break;
      case SELECTOR_CLASS:
        s = s.className((String) param);
        break;
      case SELECTOR_DESCRIPTION:
        s = s.description((String) param);
        break;
      case SELECTOR_START_DESCRIPTION:
        s = s.descriptionStartsWith((String) param);
        break;
      case SELECTOR_CONTAINS_DESCRIPTION:
        s = s.descriptionContains((String) param);
        break;
      case SELECTOR_INDEX:
        s = s.index((Integer) param);
        break;
      case SELECTOR_INSTANCE:
        s = s.instance((Integer) param);
        break;
      case SELECTOR_ENABLED:
        s = s.enabled((Boolean) param);
        break;
      case SELECTOR_FOCUSED:
        s = s.focused((Boolean) param);
        break;
      case SELECTOR_FOCUSABLE:
        s = s.focusable((Boolean) param);
        break;
      case SELECTOR_SCROLLABLE:
        s = s.scrollable((Boolean) param);
        break;
      case SELECTOR_CLICKABLE:
        s = s.clickable((Boolean) param);
        break;
      case SELECTOR_CHECKED:
        s = s.checked((Boolean) param);
        break;
      case SELECTOR_SELECTED:
        s = s.selected((Boolean) param);
        break;
      case SELECTOR_PACKAGE_NAME:
        s = s.packageName((String) param);
        break;
      case SELECTOR_LONG_CLICKABLE:
        s = s.longClickable((Boolean) param);
        break;
      case SELECTOR_TEXT_REGEX:
        s = s.textMatches((String) param);
        break;
      case SELECTOR_CLASS_REGEX:
        s = s.classNameMatches((String) param);
        break;
      case SELECTOR_DESCRIPTION_REGEX:
        s = s.descriptionMatches((String) param);
        break;
      case SELECTOR_PACKAGE_NAME_REGEX:
        s = s.packageNameMatches((String) param);
        break;
    }
  }
}