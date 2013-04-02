package io.appium.android.bootstrap;

import com.android.uiautomator.testrunner.UiAutomatorTestCase;

public class Bootstrap extends UiAutomatorTestCase {

	public void testRunServer() {
	    SocketServer server;
	    try {
	        Logger.debug("Opening socket and starting server...");
	        server = new SocketServer(4724);
	        server.listenForever();
	    } catch (SocketServerException e) {
	        Logger.error(e.getError());
	        System.exit(1);
	    }

	}

}
