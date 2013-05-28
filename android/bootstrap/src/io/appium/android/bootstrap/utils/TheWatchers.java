package io.appium.android.bootstrap.utils;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiSelector;

import io.appium.android.bootstrap.Logger;

public class TheWatchers {
  private static TheWatchers ourInstance = new TheWatchers();
  private long start = System.currentTimeMillis();
  private long delta = 1;
  private boolean alerted = false;

  public static TheWatchers getInstance() {
    return ourInstance;
  }

  private TheWatchers() {
    start = System.currentTimeMillis();
  }

  public void setDelta(long seconds) {
    delta = seconds * 1000;
  }

  public boolean check() {
    if(start + delta < System.currentTimeMillis()) {
      // Send only one alert message...
      if (isDialogPresent() && (!alerted)) {
        Logger.info("Emitting system alert message");
        alerted = true;
      }

      // if the dialog went away, make sure we can send an alert again
      if (!isDialogPresent() && alerted) {
        alerted = false;
      }

      start = System.currentTimeMillis();
    }
    return false;
  }

  public boolean isDialogPresent() {
    UiObject alertDialog = new UiObject(new UiSelector().packageName("com.android.systemui"));
    return alertDialog.exists();
  }
}
