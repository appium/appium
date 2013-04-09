package io.appium.android.bootstrap.exceptions;

/**
 * An exception that is thrown when an invalid coordinate is used.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * @param msg
 *          A descriptive message describing the error.
 */
@SuppressWarnings("serial")
public class InvalidCoordinatesException extends Exception {
  public InvalidCoordinatesException(final String msg) {
    super(msg);
  }
}
