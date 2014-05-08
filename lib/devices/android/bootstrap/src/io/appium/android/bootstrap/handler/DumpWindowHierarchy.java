package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.Logger;

import java.io.File;

import android.os.Build;
import android.os.Environment;
import android.os.SystemClock;

import com.android.uiautomator.core.UiDevice;

/**
 * This handler is used to dumpWindowHierarchy.
 * https://android.googlesource.com/
 * platform/frameworks/testing/+/master/uiautomator
 * /library/core-src/com/android/uiautomator/core/UiDevice.java
 */
public class DumpWindowHierarchy extends CommandHandler {
    public static DumpWindowHierarchy instance = null;

    // Note that
    // "new File(new File(Environment.getDataDirectory(), "local/tmp"), fileName)"
    // is directly from the UiDevice.java source code.
    private static final File dumpFolder = new File(Environment.getDataDirectory(), "local/tmp");
    private static final String dumpFileName = "dump.xml";
    private static final File dumpFile = new File(dumpFolder, dumpFileName);
    private static boolean compressed = false;

    public static boolean isCompressed() {
        return compressed;
    }

    public static void setCompressed(final boolean compress) {
        compressed = compress;
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
        dumpFolder.mkdirs();

        if (dumpFile.exists()) {
            dumpFile.delete();
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            Logger.debug("dumpWindowHierarchy. Compressed? " + compressed);
            UiDevice.getInstance().setCompressedLayoutHeirarchy(compressed);
        }

        UiDevice.getInstance().dumpWindowHierarchy(dumpFileName);

        if (!dumpFile.exists()) {
            SystemClock.sleep(1000);
            UiDevice.getInstance().dumpWindowHierarchy(dumpFileName);
        }

        return getSuccessResult(dumpFile.exists());
    }
}