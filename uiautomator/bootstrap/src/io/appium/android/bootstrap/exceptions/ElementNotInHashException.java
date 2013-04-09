package io.appium.android.bootstrap.exceptions;

/**
 * An exception that is thrown when an element can not be found in the cache,
 * but it should be.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * @param msg
 *          A descriptive message describing the error.
 * @see {@link AndroidElementHash}
 */
@SuppressWarnings("serial")
public class ElementNotInHashException extends Exception {
  public ElementNotInHashException(final String message) {
    super(message);
  }
}
