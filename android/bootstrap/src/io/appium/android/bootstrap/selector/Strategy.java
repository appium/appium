package io.appium.android.bootstrap.selector;

/**
 * An emumeration of possible strategies.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * 
 */
public enum Strategy {
  CLASS_NAME(0, "class name"), CSS_SELECTOR(1, "css selector"), ID(2, "id"), NAME(
      3, "name"), LINK_TEXT(4, "link text"), PARTIAL_LINK_TEXT(5,
      "partial link text"), TAG_NAME(6, "tag name"), XPATH(7, "xpath"), DYNAMIC(
      8, "dynamic");

  public static Strategy fromString(final String text) {
    if (text != null) {
      for (final Strategy s : Strategy.values()) {
        if (text.equalsIgnoreCase(s.strategyName)) {
          return s;
        }
      }
    }
    return null;
  }

  private final int    strategyCode;

  private final String strategyName;

  private Strategy(final int code, final String name) {
    strategyCode = code;
    strategyName = name;
  }

  public int compareTo(final String anotherString) {
    return strategyName.compareTo(anotherString);
  }

  public int compareToIgnoreCase(final String str) {
    return strategyName.compareToIgnoreCase(str);
  }

  public boolean contains(final CharSequence s) {
    return strategyName.contains(s);
  }

  public boolean contentEquals(final CharSequence cs) {
    return strategyName.contentEquals(cs);
  }

  public boolean contentEquals(final StringBuffer sb) {
    return strategyName.contentEquals(sb);
  }

  public boolean endsWith(final String suffix) {
    return strategyName.endsWith(suffix);
  }

  public boolean equalsIgnoreCase(final String anotherString) {
    return strategyName.equalsIgnoreCase(anotherString);
  }

  public int getStrategyCode() {
    return strategyCode;
  }

  public String getStrategyName() {
    return strategyName;
  }

  public boolean matches(final String regex) {
    return strategyName.matches(regex);
  }
}
