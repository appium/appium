package io.appium.android.bootstrap.exceptions;

@SuppressWarnings("serial")
public class InvalidCoordinatesException extends Exception {
  /**
   * An exception that is thrown when an invalid coordinate is used.
   *
   * @param msg
   *          A descriptive message describing the error.
   */
  public InvalidCoordinatesException(final String msg) {
    super(msg);
  }
}
