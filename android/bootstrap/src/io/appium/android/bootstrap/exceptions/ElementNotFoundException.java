package io.appium.android.bootstrap.exceptions;

/**
 * An exception thrown when the element can not be found.
 * 
 */

@SuppressWarnings("serial")
public class ElementNotFoundException extends Exception {
  public ElementNotFoundException() {
    super("Could not find an element using supplied strategy");
  }
}
