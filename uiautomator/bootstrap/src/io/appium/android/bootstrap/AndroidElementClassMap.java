package io.appium.android.bootstrap;

import io.appium.android.bootstrap.exceptions.AndroidCommandException;
import io.appium.android.bootstrap.exceptions.UnallowedTagNameException;

import java.util.ArrayList;
import java.util.HashMap;

/**
 * Helper class to match up tag names and UI element class names.
 * 
 */
public class AndroidElementClassMap {

  private final HashMap<String, String> map;
  private final ArrayList<String>       unallowed;
  private static AndroidElementClassMap instance;

  /**
   * Generator
   * 
   * @return
   */
  private static AndroidElementClassMap getInstance() {
    if (AndroidElementClassMap.instance == null) {
      AndroidElementClassMap.instance = new AndroidElementClassMap();
    }
    return AndroidElementClassMap.instance;
  }

  /**
   * Find a matching UI element class name based on the tag name.
   * 
   * @param selector_text
   * @return String
   * @throws AndroidCommandException
   */
  public static String match(String selector_text)
      throws AndroidCommandException, UnallowedTagNameException {
    final AndroidElementClassMap inst = AndroidElementClassMap.getInstance();
    if (inst.unallowed.contains(selector_text)) {
      throw new UnallowedTagNameException(selector_text);
    } else {
      final String mappedSel = inst.map.get(selector_text);
      if (mappedSel != null) {
        return "android.widget." + mappedSel;
      } else if (selector_text.contains(".")) {
        return selector_text;
      } else {
        selector_text = selector_text.substring(0, 1).toUpperCase()
            + selector_text.substring(1);
        return "android.widget." + selector_text;
      }
    }
  }

  public AndroidElementClassMap() {
    map = new HashMap<String, String>();
    unallowed = new ArrayList<String>();
    map.put("text", "TextView");
    map.put("list", "ListView");
    map.put("textfield", "EditText");

    unallowed.add("secure");
  }
}
