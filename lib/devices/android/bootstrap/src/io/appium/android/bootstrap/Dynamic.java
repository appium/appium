package io.appium.android.bootstrap;

import java.util.ArrayList;

import org.json.JSONArray;
import org.json.JSONException;

import com.android.uiautomator.core.UiSelector;

// Constants from
// https://android.googlesource.com/platform/frameworks/testing/+/master/uiautomator/library/core-src/com/android/uiautomator/core/UiSelector.java
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
  /** resourceId(String id) */
  private static final int SELECTOR_RESOURCE_ID = 29;
  /** checkable(boolean val) */
  private static final int SELECTOR_CHECKABLE = 30;
  /** resourceIdMatches(String regex) */
  private static final int SELECTOR_RESOURCE_ID_REGEX = 31;
  // start internal methods at 100
  /**
   * Gets name (content desc) with a fall back to text if name is empty.
   * 
   * getStringAttribute("name")
   */
  private static final int GET_NAME                      = 100;

  public static String finalize(final AndroidElement result, final int finalizer)
      throws Exception {
    // Invoke the int 100+ method on the resulting element.
    String value = "";
    switch (finalizer) {
      case GET_NAME:
        value = result.getStringAttribute("name");
        break;
    }

    return value;
  }

  public static ArrayList<String> finalize(
      final ArrayList<AndroidElement> elements, final int finalizer)
      throws Exception {
    final ArrayList<String> results = new ArrayList<String>();
    for (final AndroidElement e : elements) {
      final String result = finalize(e, finalizer);
      Logger.debug("Adding: " + result);
      results.add(result);
    }
    return results;
  }

  private UiSelector s = new UiSelector();

  public UiSelector get(final JSONArray array) throws JSONException {
    // Reset selector.
    s = new UiSelector();
    // Example pair.
    // Find everything containing the text sign.
    // [ [3, 'sign'] ]
    for (int a = 0; a < array.length(); a++) {
      final JSONArray pair = array.getJSONArray(a);
      final int int0 = pair.getInt(0);
      if (int0 >= 100) {
        // 100+ are finalizers only.
        continue;
      }
      final Object param1 = pair.get(1);
      Logger.debug("Updating " + int0 + ", " + param1);
      update(int0, param1);
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
      case SELECTOR_RESOURCE_ID:
        s = s.resourceId((String) param);
        break;
      case SELECTOR_CHECKABLE:
        s = s.checkable((Boolean) param);
        break;
      case SELECTOR_RESOURCE_ID_REGEX:
        s = s.resourceIdMatches((String) param);
        break;
    }
  }
}