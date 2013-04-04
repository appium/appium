package io.appium.android.bootstrap;

import io.appium.android.bootstrap.exceptions.SocketServerException;

import com.android.uiautomator.testrunner.UiAutomatorTestCase;

/**
 * The Bootstrap class runs the socket server.
 * 
 */
public class Bootstrap extends UiAutomatorTestCase {

  public void testRunServer() {
    SocketServer server;
    try {
      server = new SocketServer(4724);
      server.listenForever();
    } catch (final SocketServerException e) {
      Logger.error(e.getError());
      System.exit(1);
    }

  }
}
