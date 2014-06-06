package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;

import static io.appium.android.bootstrap.utils.API.API_18;
import com.android.uiautomator.core.UiDevice;

/**
 * This handler is used to open the notification shade on the device.
 *
 */
public class OpenNotification extends CommandHandler {

  /*
   * @param command The {@link AndroidCommand} used for this handler.
   *
   * @return {@link AndroidCommandResult}
   *
   * @see io.appium.android.bootstrap.CommandHandler#execute(io.appium.android.
   * bootstrap.AndroidCommand)
   */
  @Override
  public AndroidCommandResult execute(final AndroidCommand command) {
    // method was only introduced in API Level 18
    if (!API_18) {
      return getErrorResult("Unable to open notifications on device below API level 18");
    }

    // does not make sense on an element
    if (command.isElementCommand()) {
      return getErrorResult("Unable to open notifications on an element.");
    }

    final UiDevice device = UiDevice.getInstance();
    if (device.openNotification()) {
      return getSuccessResult(true);
    } else {
      return getErrorResult("Device failed to open notifications.");
    }
  }
}
