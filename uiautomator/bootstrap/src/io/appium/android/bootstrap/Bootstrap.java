package io.appium.android.bootstrap;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiScrollable;
import com.android.uiautomator.core.UiSelector;
import com.android.uiautomator.testrunner.UiAutomatorTestCase;

import io.appium.android.bootstrap.SocketServer;
import io.appium.android.bootstrap.Logger;

public class Bootstrap extends UiAutomatorTestCase {

	public void testRunServer() {
	    SocketServer server;
	    try {
	        server = new SocketServer(4724);
	        server.listenForever();
	    } catch (SocketServerException e) {
	        Logger.error(e.getError());
	        System.exit(1);
	    }

	}

}
