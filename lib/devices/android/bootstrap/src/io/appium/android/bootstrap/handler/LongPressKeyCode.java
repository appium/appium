package io.appium.android.bootstrap.handler;

import android.os.SystemClock;
import android.view.InputDevice;
import android.view.KeyCharacterMap;
import android.view.KeyEvent;
import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.uiautomator.core.InteractionController;
import io.appium.uiautomator.core.UiAutomatorBridge;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Hashtable;

/**
 * This handler is used to LongPressKeyCode.
 * 
 */
public class LongPressKeyCode extends CommandHandler {
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
      InteractionController interactionController = UiAutomatorBridge.getInstance().getInteractionController();

      final Hashtable<String, Object> params = command.params();
      keyCode = (Integer) params.get("keycode");
      metaState = params.get("metastate") != JSONObject.NULL ? (Integer) params
          .get("metastate") : 0;
      final long eventTime = SystemClock.uptimeMillis();
      // Send an initial down event
      final KeyEvent downEvent = new KeyEvent(eventTime, eventTime,
          KeyEvent.ACTION_DOWN, keyCode, 0, metaState,
          KeyCharacterMap.VIRTUAL_KEYBOARD, 0, 0, InputDevice.SOURCE_KEYBOARD);
      if (interactionController.injectEventSync(downEvent)) {
        // Send a repeat event. This will cause the FLAG_LONG_PRESS to be set.
        final KeyEvent repeatEvent = KeyEvent.changeTimeRepeat(downEvent,
            eventTime, 1);
        interactionController.injectEventSync(repeatEvent);
        // Finally, send the up event
        final KeyEvent upEvent = new KeyEvent(eventTime, eventTime,
            KeyEvent.ACTION_UP, keyCode, 0, metaState,
            KeyCharacterMap.VIRTUAL_KEYBOARD, 0, 0, InputDevice.SOURCE_KEYBOARD);
        interactionController.injectEventSync(upEvent);
      }
      return getSuccessResult(true);
    } catch (final Exception e) {
      return getErrorResult(e.getMessage());
    }
  }
}
