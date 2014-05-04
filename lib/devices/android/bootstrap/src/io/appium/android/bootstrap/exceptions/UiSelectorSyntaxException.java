package io.appium.android.bootstrap.exceptions;

import io.appium.android.bootstrap.utils.UiSelectorParser;

/**
 * An exception involving an {@link UiSelectorParser}.
 *
 * @param msg
 *          A descriptive message describing the error.
 */
@SuppressWarnings("serial")
public class UiSelectorSyntaxException extends Exception {

  public UiSelectorSyntaxException(final String msg) {
    super(msg);
  }
}
