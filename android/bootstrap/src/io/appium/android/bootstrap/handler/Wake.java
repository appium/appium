package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;
import android.os.RemoteException;

import com.android.uiautomator.core.UiDevice;

/**
 * This handler is used to get the size of the screen.
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
    final UiDevice d = UiDevice.getInstance();
    try {
      d.wakeUp();
      final Boolean res = true;
      return getSuccessResult(res);
    } catch (final RemoteException e) {
      return getErrorResult("Error waking up device");
    }
  }
}
