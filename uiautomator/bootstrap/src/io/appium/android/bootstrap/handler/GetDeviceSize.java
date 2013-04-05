package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;

import org.json.JSONException;
import org.json.JSONObject;

import com.android.uiautomator.core.UiDevice;

/**
 * This handler is used to get the size of the screen.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * 
 */
public class GetDeviceSize extends CommandHandler {

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
    if (!command.isElementCommand()) {
      // only makes sense on a device
      final UiDevice d = UiDevice.getInstance();
      final JSONObject res = new JSONObject();
      try {
        res.put("width", d.getDisplayHeight());
        res.put("height", d.getDisplayWidth());
      } catch (final JSONException e) {
        getErrorResult("Error serializing height/width data into JSON");
      }
      return getSuccessResult(res);
    } else {
      return getErrorResult("Unable to get attribute without an element.");
    }
  }
}
