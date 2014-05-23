package io.appium.android.bootstrap.handler;

import android.os.Environment;
import com.android.uiautomator.core.UiDevice;
import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.utils.NotImportantViews;

import java.io.File;

/**
 * This handler is used to dumpWindowHierarchy.
 * https://android.googlesource.com/
 * platform/frameworks/testing/+/master/uiautomator
 * /library/core-src/com/android/uiautomator/core/UiDevice.java
 */
public class DumpWindowHierarchy extends CommandHandler {
  // Note that
  // "new File(new File(Environment.getDataDirectory(), "local/tmp"), fileName)"
  // is directly from the UiDevice.java source code.
  private static final File dumpFolder = new File(Environment.getDataDirectory(), "local/tmp");
  private static final String dumpFileName = "dump.xml";
  private static final File dumpFile = new File(dumpFolder, dumpFileName);

  private static void deleteDumpFile() {
    if (dumpFile.exists()) {
      dumpFile.delete();
    }
  }

  public static boolean dump() {
    dumpFolder.mkdirs();

    deleteDumpFile();

    try {
      // dumpWindowHierarchy often has a NullPointerException
      UiDevice.getInstance().dumpWindowHierarchy(dumpFileName);
    } catch (Exception e) {
      e.printStackTrace();
      // If there's an error then the dumpfile may exist and be empty.
      deleteDumpFile();
    }

    return dumpFile.exists();
  }

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
    NotImportantViews.discard(true);
    return getSuccessResult(dump());
  }
}