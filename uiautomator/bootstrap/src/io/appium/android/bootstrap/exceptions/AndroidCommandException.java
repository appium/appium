package io.appium.android.bootstrap.exceptions;

import io.appium.android.bootstrap.AndroidCommand;

/**
 * An exception involving an {@link AndroidCommand}.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * @param msg
 *          A descriptive message describing the error.
 */
@SuppressWarnings("serial")
public class AndroidCommandException extends Exception {

  public AndroidCommandException(final String msg) {
    super(msg);
  }
}
