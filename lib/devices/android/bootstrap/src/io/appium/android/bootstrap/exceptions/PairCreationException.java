package io.appium.android.bootstrap.exceptions;

/**
 * For trying to create a ClassInstancePair and something goes wrong.
 */
public class PairCreationException extends Throwable {
  public PairCreationException(String msg) { super(msg); }
}
