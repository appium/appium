package io.appium.android.bootstrap.handler;

import android.os.RemoteException;
import com.android.uiautomator.core.UiDevice;
import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;

/**
 * This handler is used to power on the device if it's not currently awake.
 * 
 */
public class Wake extends CommandHandler {

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
    // only makes sense on a device
    try {
      UiDevice.getInstance().wakeUp();
      return getSuccessResult(true);
    } catch (final RemoteException e) {
      return getErrorResult("Error waking up device");
    }
  }
}
