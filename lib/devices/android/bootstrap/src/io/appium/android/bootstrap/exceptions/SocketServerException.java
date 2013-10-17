package io.appium.android.bootstrap.exceptions;

/**
 * Exception for socket errors.
 * 
 * @param msg
 *          A descriptive message describing the error.
 */
@SuppressWarnings("serial")
public class SocketServerException extends Exception {

  String reason;

  public SocketServerException(final String msg) {
    super(msg);
    reason = msg;
  }

  public String getError() {
    return reason;
  }
}
