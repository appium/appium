package io.appium.android.bootstrap;

import io.appium.android.bootstrap.exceptions.AndroidCommandException;
import io.appium.android.bootstrap.handler.Click;
import io.appium.android.bootstrap.handler.Find;
import io.appium.android.bootstrap.handler.Flick;
import io.appium.android.bootstrap.handler.GetAttribute;
import io.appium.android.bootstrap.handler.GetDeviceSize;
import io.appium.android.bootstrap.handler.GetText;
import io.appium.android.bootstrap.handler.SetText;
import io.appium.android.bootstrap.handler.Swipe;

import java.util.HashMap;

import org.json.JSONException;

/**
 * Command execution dispatch class. This class relays commands to the various
 * handlers.
 * 
 */
class AndroidCommandExecutor {

  private static HashMap<String, CommandHandler> map = new HashMap<String, CommandHandler>();

  static {
    map.put("swipe", new Swipe());
    map.put("flick", new Flick());
    map.put("click", new Click());
    map.put("getText", new GetText());
    map.put("setText", new SetText());
    map.put("getAttribute", new GetAttribute());
    map.put("getDeviceSize", new GetDeviceSize());
    map.put("find", new Find());
  }

  /**
   * Gets the handler out of the map, and executes the command.
   * 
   * @param command
   * @return {@link AndroidCommandResult}
   * @throws AndroidCommandException
   */
  public AndroidCommandResult execute(final AndroidCommand command)
      throws AndroidCommandException {

    try {
      Logger.debug("Got command action: " + command.action());

      if (map.containsKey(command.action())) {
        return map.get(command.action()).execute(command);
      } else {
        return new AndroidCommandResult(WDStatus.UNKNOWN_COMMAND,
            "Unknown command: " + command.action());
      }
    } catch (final JSONException e) {
      Logger.error("Could not decode action/params of command");
      return new AndroidCommandResult(WDStatus.JSON_DECODER_ERROR,
          "Could not decode action/params of command, please check format!");
    }
  }
}