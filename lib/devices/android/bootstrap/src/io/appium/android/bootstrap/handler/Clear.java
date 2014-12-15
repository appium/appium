package io.appium.android.bootstrap.handler;

import android.graphics.Rect;
import android.os.SystemClock;
import android.view.InputDevice;
import android.view.KeyCharacterMap;
import android.view.KeyEvent;
import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiSelector;
import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.Logger;
import io.appium.android.bootstrap.WDStatus;
import io.appium.uiautomator.core.InteractionController;
import io.appium.uiautomator.core.UiAutomatorBridge;
import org.json.JSONException;

import java.lang.reflect.InvocationTargetException;

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

        // first, try to do native clearing
        Logger.debug("Attempting to clear using UiObject.clearText().");
        el.clearText();
        if (el.getText().isEmpty()) {
          return getSuccessResult(true);
        }

        // see if there is hint text
        if (hasHintText(el)) {
          Logger.debug("Text remains after clearing, "
              + "but it appears to be hint text.");
          return getSuccessResult(true);
        }

        // next try to select everything and delete
        Logger.debug("Clearing text not successful. Attempting to clear " +
                "by selecting all and deleting.");
        if (selectAndDelete(el)) {
          return getSuccessResult(true);
        }

        // see if there is hint text
        if (hasHintText(el)) {
          Logger.debug("Text remains after clearing, "
              + "but it appears to be hint text.");
          return getSuccessResult(true);
        }

        // finally try to send delete keys
        Logger.debug("Clearing text not successful. Attempting to clear " +
                "by sending delete keys.");
        if (sendDeleteKeys(el)) {
          return getSuccessResult(true);
        }

        if (!el.getText().isEmpty()) {
          // either there was a failure, or there is hint text
          if (hasHintText(el)) {
            Logger.debug("Text remains after clearing, " +
                    "but it appears to be hint text.");
            return getSuccessResult(true);
          } else if (!el.getText().isEmpty()) {
            Logger.debug("Exhausted all means to clear text but '" +
                    el.getText() + "' remains.");
            return getErrorResult("Clear text not successful.");
          }
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

  private boolean selectAndDelete(AndroidElement el)
      throws UiObjectNotFoundException, IllegalAccessException,
        InvocationTargetException, NoSuchMethodException {
    Rect rect = el.getVisibleBounds();
    // Trying to select entire text.
    TouchLongClick.correctLongClick(rect.left + 20, rect.centerY(), 2000);
    UiObject selectAll = new UiObject(new UiSelector().descriptionContains("Select all"));
    if (selectAll.waitForExists(2000)) {
      selectAll.click();
    }
    // wait for the selection
    SystemClock.sleep(500);
    // delete it
    UiAutomatorBridge.getInstance().getInteractionController().sendKey(KeyEvent.KEYCODE_DEL, 0);

    return el.getText().isEmpty();
  }

  private boolean sendDeleteKeys(AndroidElement el)
      throws UiObjectNotFoundException, IllegalAccessException,
        InvocationTargetException, NoSuchMethodException {
    String tempTextHolder = "";

    // Preventing infinite while loop.
    while (!el.getText().isEmpty() && !tempTextHolder.equalsIgnoreCase(el.getText())) {
      // Trying send delete keys after clicking in text box.
      el.click();
      // Sending delete keys asynchronously, both forward and backward
      for (int key : new int[] { KeyEvent.KEYCODE_DEL, KeyEvent.KEYCODE_FORWARD_DEL }) {
        tempTextHolder = el.getText();
        final int length = tempTextHolder.length();
        final long eventTime = SystemClock.uptimeMillis();
        KeyEvent deleteEvent = new KeyEvent(eventTime, eventTime, KeyEvent.ACTION_DOWN,
                key, 0, 0, KeyCharacterMap.VIRTUAL_KEYBOARD, 0, 0,
                InputDevice.SOURCE_KEYBOARD);
        for (int count = 0; count < length; count++) {
          UiAutomatorBridge.getInstance().injectInputEvent(deleteEvent, false);
        }
      }
    }

    return el.getText().isEmpty();
  }

  private boolean hasHintText(AndroidElement el)
      throws UiObjectNotFoundException, IllegalAccessException,
        InvocationTargetException, NoSuchMethodException {
    // to test if the remaining text is hint text, try sending a single
    // delete key and testing if there is any change.
    // ignore the off-chance that the delete silently fails and we get a false
    // positive.
    String currText = el.getText();

    try {
      if (!el.getBoolAttribute("focused")) {
        Logger.debug("Could not check for hint text because the element is not focused!");
        return false;
      }
    } catch (final Exception e) {
      Logger.debug("Could not check for hint text: " + e.getMessage());
      return false;
    }

    InteractionController interactionController = UiAutomatorBridge.getInstance().getInteractionController();
    interactionController.sendKey(KeyEvent.KEYCODE_DEL, 0);
    interactionController.sendKey(KeyEvent.KEYCODE_FORWARD_DEL, 0);

    return currText.equals(el.getText());
  }
}
