package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;

import com.android.uiautomator.core.UiDevice;

/**
 * This handler is used to dumpWindowHierarchy.
 * 
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
    // root is /data/local/tmp/
    UiDevice.getInstance().dumpWindowHierarchy("dump.xml");
    return getSuccessResult(true);
  }
}