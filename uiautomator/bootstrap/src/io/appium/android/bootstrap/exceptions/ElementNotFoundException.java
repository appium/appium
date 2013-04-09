package io.appium.android.bootstrap.exceptions;

/**
 * An exception thrown when the element can not be found.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 */

@SuppressWarnings("serial")
public class ElementNotFoundException extends Exception {
  public ElementNotFoundException() {
    super("Could not find an element using supplied strategy");
  }
}
