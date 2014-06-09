package io.appium.android.bootstrap.exceptions;

@SuppressWarnings("serial")
public class UnallowedTagNameException extends Exception {
  /**
   * This exception is thrown when the tag name is not supported
   *
   * @param tag
   *          The tag that was searched for.
   */
  public UnallowedTagNameException(final String tag) {
    super("Tag name '" + tag + "' is not supported in Android");
  }
}
