package io.appium.android.bootstrap;

import io.appium.android.bootstrap.exceptions.AndroidCommandException;
import io.appium.android.bootstrap.handler.Clear;
import io.appium.android.bootstrap.handler.Click;
import io.appium.android.bootstrap.handler.Drag;
import io.appium.android.bootstrap.handler.DumpWindowHierarchy;
import io.appium.android.bootstrap.handler.EnableCompressedLayoutHeirarchy;
import io.appium.android.bootstrap.handler.Find;
import io.appium.android.bootstrap.handler.Flick;
import io.appium.android.bootstrap.handler.GetAttribute;
import io.appium.android.bootstrap.handler.GetDataDir;
import io.appium.android.bootstrap.handler.GetDeviceSize;
import io.appium.android.bootstrap.handler.GetLocation;
import io.appium.android.bootstrap.handler.GetName;
import io.appium.android.bootstrap.handler.GetSize;
import io.appium.android.bootstrap.handler.GetStrings;
import io.appium.android.bootstrap.handler.GetText;
import io.appium.android.bootstrap.handler.Orientation;
import io.appium.android.bootstrap.handler.Pinch;
import io.appium.android.bootstrap.handler.PressBack;
import io.appium.android.bootstrap.handler.PressKeyCode;
import io.appium.android.bootstrap.handler.ScrollTo;
import io.appium.android.bootstrap.handler.SetText;
import io.appium.android.bootstrap.handler.Swipe;
import io.appium.android.bootstrap.handler.TakeScreenshot;
import io.appium.android.bootstrap.handler.TouchDown;
import io.appium.android.bootstrap.handler.TouchLongClick;
import io.appium.android.bootstrap.handler.TouchMove;
import io.appium.android.bootstrap.handler.TouchUp;
import io.appium.android.bootstrap.handler.WaitForIdle;
import io.appium.android.bootstrap.handler.Wake;

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
    map.put("waitForIdle", new WaitForIdle());
    map.put("clear", new Clear());
    map.put("orientation", new Orientation());
    map.put("swipe", new Swipe());
    map.put("flick", new Flick());
    map.put("drag", new Drag());
    map.put("pinch", new Pinch());
    map.put("click", new Click());
    map.put("touchLongClick", new TouchLongClick());
    map.put("touchDown", new TouchDown());
    map.put("touchUp", new TouchUp());
    map.put("touchMove", new TouchMove());
    map.put("getText", new GetText());
    map.put("setText", new SetText());
    map.put("getName", new GetName());
    map.put("getAttribute", new GetAttribute());
    map.put("getDeviceSize", new GetDeviceSize());
    map.put("scrollTo", new ScrollTo());
    map.put("find", new Find());
    map.put("getLocation", new GetLocation());
    map.put("getSize", new GetSize());
    map.put("wake", new Wake());
    map.put("pressBack", new PressBack());
    map.put("dumpWindowHierarchy", new DumpWindowHierarchy());
    map.put("pressKeyCode", new PressKeyCode());
    map.put("takeScreenshot", new TakeScreenshot());
    map.put("enableCompressedLayoutHeirarchy",
        new EnableCompressedLayoutHeirarchy());
    map.put("getStrings", new GetStrings());
    map.put("getDataDir", new GetDataDir());
  }

  /**
   * Gets the handler out of the map, and executes the command.
   * 
   * @param command
   *          The {@link AndroidCommand}
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
