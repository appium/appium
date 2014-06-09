package io.appium.android.bootstrap.exceptions;

@SuppressWarnings("serial")
public class NoAttributeFoundException extends Exception {
  /**
   * This exception is thrown when the element doesn't have the attribute searched
   * for.
   *
   * @param attr
   *          The attribute searched for.
   */
  public NoAttributeFoundException(final String attr) {
    super("This element does not have the '" + attr + "' attribute");
  }
}
