package io.appium.android.bootstrap.handler;

import com.android.uiautomator.core.UiObjectNotFoundException;
import io.appium.android.bootstrap.*;
import org.json.JSONException;
import android.os.SystemClock;
import android.view.KeyEvent;
import java.lang.reflect.Method;
import android.graphics.Rect;
import com.android.uiautomator.common.ReflectionUtils;
import com.android.uiautomator.core.UiObject;
import android.view.InputDevice;
import android.view.KeyCharacterMap;
import com.android.uiautomator.core.UiSelector;



/**
 * This handler is used to clear elements in the Android UI.
 *
 * Based on the element Id, clear that element.
 *
 * UiAutomator method clearText is flaky hence overriding it with custom implementation.
 */
public class Clear extends CommandHandler {

  /*
   * Trying to select entire text with correctLongClick and increasing time intervals.
   * Checking if element still has text in them and and if true falling back on UiAutomator clearText
   *
   * @param command The {@link AndroidCommand}
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
    if (command.isElementCommand()) {
      try {
        final AndroidElement el = command.getElement();
        final ReflectionUtils utils = new ReflectionUtils();
        Rect rect = el.getVisibleBounds();
        // Trying to select entire text.
        TouchLongClick.correctLongClick(rect.left + 20, rect.centerY(),2000);
        UiObject selectAll = new UiObject(new UiSelector().descriptionContains("Select all"));
        if (selectAll.waitForExists(2000)) {
            selectAll.click();
        }
        // wait for the selection
        SystemClock.sleep(500);
        // delete it
        final Method sendKey = utils.getControllerMethod("sendKey", int.class,int.class);
        sendKey.invoke(utils.getController(), KeyEvent.KEYCODE_DEL, 0);
        if (el.getText().isEmpty()) {
          return getSuccessResult(true);
        }
        // If above strategy does not work then sending bunch of delete keys after clicking on element.
        Logger.debug("Clearing text not successful using selectAllDelete now trying to send delete keys.");
        String tempTextHolder = "";
        final Object bridgeObject = utils.getBridge();
        final Method injectInputEvent = utils.getMethodInjectInputEvent();
        // Preventing infinite while loop.
        while (!el.getText().isEmpty() && !tempTextHolder.equalsIgnoreCase(el.getText())) {
            tempTextHolder = el.getText();
            // Trying send delete keys after clicking in text box.
            el.click();
            // Sending 25 delete keys asynchronously
            final long eventTime = SystemClock.uptimeMillis();
            KeyEvent deleteEvent = new KeyEvent(eventTime, eventTime, KeyEvent.ACTION_DOWN,
                    KeyEvent.KEYCODE_DEL, 0, 0, KeyCharacterMap.VIRTUAL_KEYBOARD, 0, 0,
                    InputDevice.SOURCE_KEYBOARD);
            for (int count = 0; count < 25; count++) {
                injectInputEvent.invoke(bridgeObject, deleteEvent, false);
            }
        }
        // If still text exist falling back on UIautomator clearText.
        if (!el.getText().isEmpty()) {
           Logger.debug("Clearing text not successful falling back to UiAutomator method clear");
           el.clearText();
        }
        // If clear text is still unsuccessful throwing error back
        if (!el.getText().isEmpty()) {
            return getErrorResult("Clear text not successful.");
        }
        return getSuccessResult(true);
      } catch (final UiObjectNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final Exception e) { // handle NullPointerException
        return getErrorResult("Unknown error clearing text");
      }
  }
      return getErrorResult("Unknown error");
    }
  }
