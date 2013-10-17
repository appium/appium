package io.appium.android.bootstrap.exceptions;

import io.appium.android.bootstrap.selector.Strategy;

/**
 * An exception that is thrown when an invalid strategy is used.
 * 
 * @param msg
 *          A descriptive message describing the error.
 * @see {@link Strategy}
 */
@SuppressWarnings("serial")
public class InvalidStrategyException extends Exception {
  public InvalidStrategyException(final String msg) {
    super(msg);
  }
}
