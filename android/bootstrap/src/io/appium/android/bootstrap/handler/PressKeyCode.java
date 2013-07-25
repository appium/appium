package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;

import com.android.uiautomator.core.UiDevice;

/**
 * This handler is used to PressKeyCode.
 * 
 */
public class PressKeyCode extends CommandHandler {

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
    try {
      UiDevice.getInstance().pressKeyCode(
          (Integer) command.params().get("keycode"));
      return getSuccessResult(true);
    } catch (final Exception e) {
      return getErrorResult(e.getMessage());
    }
  }
}