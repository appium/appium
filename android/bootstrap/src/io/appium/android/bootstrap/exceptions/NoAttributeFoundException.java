package io.appium.android.bootstrap.exceptions;

/**
 * This exception is thrown when the element doesn't have the attribute searched
 * for.
 * 
 * @param attr
 *          The attribute searched for.
 */
@SuppressWarnings("serial")
public class NoAttributeFoundException extends Exception {
  public NoAttributeFoundException(final String attr) {
    super("This element does not have the '" + attr + "' attribute");
  }
}
