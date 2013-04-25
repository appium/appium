package io.appium.android.exceptions;


/**
 * An ADB exception
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * @param msg
 *          A descriptive message describing the error.
 */
@SuppressWarnings("serial")
public class AdbException extends Exception {

  public AdbException(final String msg) {
    super(msg);
  }
}
