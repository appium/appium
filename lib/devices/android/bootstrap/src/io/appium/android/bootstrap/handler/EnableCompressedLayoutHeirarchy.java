package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;

import org.json.JSONException;

import android.os.Build;

import com.android.uiautomator.core.UiDevice;

/**
 * This handler is used to EnableCompressedLayoutHeirarchy.
 * 
 */
public class EnableCompressedLayoutHeirarchy extends CommandHandler {

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
  public AndroidCommandResult execute(final AndroidCommand command)
      throws JSONException {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
        UiDevice.getInstance().setCompressedLayoutHeirarchy(true);
      }
    } catch (final Exception e) {
      return getErrorResult(e.getMessage());
    }
    return getSuccessResult(true);
  }
}