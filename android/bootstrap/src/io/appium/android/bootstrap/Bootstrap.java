package io.appium.android.bootstrap;

import io.appium.android.bootstrap.exceptions.SocketServerException;

import com.android.uiautomator.testrunner.UiAutomatorTestCase;

import android.os.Bundle;

/**
 * The Bootstrap class runs the socket server.
 * 
 */
public class Bootstrap extends UiAutomatorTestCase {

  public void testRunServer() {
    SocketServer server;
    Bundle params;
    String devicePort;
    try {
      params = getParams();
      devicePort = params.getString("devicePort", "4724");
      server = new SocketServer(Integer.parseInt(devicePort));
      server.listenForever();
    } catch (final SocketServerException e) {
      Logger.error(e.getError());
      System.exit(1);
    }

  }
}
