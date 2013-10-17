package io.appium.android.bootstrap.exceptions;

/**
 * An exception thrown when the element can not be found.
 * 
 */

@SuppressWarnings("serial")
public class ElementNotFoundException extends Exception {
  final static String error = "Could not find an element using supplied strategy. ";

  public ElementNotFoundException() {
    super(error);
  }

  public ElementNotFoundException(final String extra) {
    super(error + extra);
  }
}