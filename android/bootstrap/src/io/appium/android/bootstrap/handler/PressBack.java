package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;

import com.android.uiautomator.core.UiDevice;

/**
 * This handler is used to press back.
 * 
 */
public class PressBack extends CommandHandler {

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
    UiDevice.getInstance().pressBack();
    // Press back returns false even when back was successfully pressed.
    // Always return true.
    return getSuccessResult(true);
  }
}
