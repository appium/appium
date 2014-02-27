package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;

import java.io.File;

import android.os.Environment;

import com.android.uiautomator.core.UiDevice;

/**
 * This handler is used to dumpWindowHierarchy.
 * https://android.googlesource.com/
 * platform/frameworks/testing/+/master/uiautomator
 * /library/core-src/com/android/uiautomator/core/UiDevice.java
 */
public class DumpWindowHierarchy extends CommandHandler {

  /*
   * @param command The {@link AndroidCommand} used for this handler.
   * 
   * @return {@link AndroidCommandResult}
   * 
   * @throws JSONException
   * 
   * @see io.appium.android.bootstrap.CommandHandler#execute(io.appium.android.
   * bootstrap.AndroidCommand)
   */
  @Override
  public AndroidCommandResult execute(final AndroidCommand command) {

    final String dumpXml = "dump.xml";
    final File dump = new File(new File(Environment.getDataDirectory(),
        "local/tmp"), dumpXml);
    dump.mkdirs();

    if (dump.exists()) {
      dump.delete();
    }

    UiDevice.getInstance().dumpWindowHierarchy(dumpXml);
    return getSuccessResult(true);
  }
}