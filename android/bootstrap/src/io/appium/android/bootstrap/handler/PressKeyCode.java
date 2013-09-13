package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;

import java.util.Hashtable;

import org.json.JSONException;
import org.json.JSONObject;

import com.android.uiautomator.core.UiDevice;

/**
 * This handler is used to PressKeyCode.
 * 
 */
public class PressKeyCode extends CommandHandler {
  public Integer keyCode;
  public Integer metaState;

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
      final Hashtable<String, Object> params = command.params();
      keyCode = (Integer) params.get("keycode");

      if (params.get("metastate") != JSONObject.NULL) {
        metaState = (Integer) params.get("metastate");
      }

      UiDevice.getInstance().pressKeyCode(keyCode, metaState);

      return getSuccessResult(true);
    } catch (final Exception e) {
      return getErrorResult(e.getMessage());
    }
  }
}
