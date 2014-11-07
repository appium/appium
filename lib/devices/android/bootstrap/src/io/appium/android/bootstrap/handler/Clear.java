package io.appium.android.bootstrap.handler;

import android.graphics.Rect;
import android.os.SystemClock;
import android.view.InputDevice;
import android.view.KeyCharacterMap;
import android.view.KeyEvent;
import com.android.uiautomator.common.ReflectionUtils;
import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiSelector;
import io.appium.android.bootstrap.*;
import java.lang.reflect.Method;
import java.lang.reflect.InvocationTargetException;
import org.json.JSONException;


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

        final ReflectionUtils utils = new ReflectionUtils();

        // see if there is hint text
        if (hasHintText(el, utils)) {
          Logger.debug("Text remains after clearing, "
              + "but it appears to be hint text.");
          return getSuccessResult(true);
        }

        // next try to select everything and delete
        Logger.debug("Clearing text not successful. Attempting to clear " +
                     "by selecting all and deleting.");
        if (selectAndDelete(el, utils)) {
          return getSuccessResult(true);
        }

        // see if there is hint text
        if (hasHintText(el, utils)) {
          Logger.debug("Text remains after clearing, "
              + "but it appears to be hint text.");
          return getSuccessResult(true);
        }

        // finally try to send delete keys
        Logger.debug("Clearing text not successful. Attempting to clear " +
                     "by sending delete keys.");
        if (sendDeleteKeys(el, utils)) {
          return getSuccessResult(true);
        }

        if (!el.getText().isEmpty()) {
          // either there was a failure, or there is hint text
          if (hasHintText(el, utils)) {
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

  private boolean selectAndDelete(AndroidElement el, final ReflectionUtils utils)
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
    final Method sendKey = utils.getControllerMethod("sendKey", int.class, int.class);
    sendKey.invoke(utils.getController(), KeyEvent.KEYCODE_DEL, 0);

    return el.getText().isEmpty();
  }

  private boolean sendDeleteKeys(AndroidElement el, final ReflectionUtils utils)
      throws UiObjectNotFoundException, IllegalAccessException,
        InvocationTargetException, NoSuchMethodException {
    String tempTextHolder = "";
    final Object bridgeObject = utils.getBridge();
    final Method injectInputEvent = utils.getMethodInjectInputEvent();

    // Preventing infinite while loop.
    while (!el.getText().isEmpty() && !tempTextHolder.equalsIgnoreCase(el.getText())) {
      tempTextHolder = el.getText();
      // Trying send delete keys after clicking in text box.
      el.click();
      // Sending correct delete keys asynchronously
      final int length = tempTextHolder.length();
      final long eventTime = SystemClock.uptimeMillis();
      KeyEvent deleteEvent = new KeyEvent(eventTime, eventTime, KeyEvent.ACTION_DOWN,
              KeyEvent.KEYCODE_DEL, 0, 0, KeyCharacterMap.VIRTUAL_KEYBOARD, 0, 0,
              InputDevice.SOURCE_KEYBOARD);
      for (int count = 0; count < length; count++) {
          injectInputEvent.invoke(bridgeObject, deleteEvent, false);
      }
    }

    return el.getText().isEmpty();
  }

  private boolean hasHintText(AndroidElement el, final ReflectionUtils utils)
      throws UiObjectNotFoundException, IllegalAccessException,
        InvocationTargetException, NoSuchMethodException {
    // to test if the remaining text is hint text, try sending a single
    // delete key and testing if there is any change.
    // ignore the off-chance that the delete silently fails and we get a false
    // positive.
    String currText = el.getText();

    final Method sendKey = utils.getControllerMethod("sendKey", int.class, int.class);
    try {
      if (!el.getBoolAttribute("focused")) {
        Logger.debug("Could not check for hint text because the element is not focused!");
        return false;
      }
    } catch(final Exception e) {
      Logger.debug("Could not check for hint text: " + e.getMessage());
      return false;
    }
    sendKey.invoke(utils.getController(), KeyEvent.KEYCODE_BUTTON_THUMBR, 0);
    sendKey.invoke(utils.getController(), KeyEvent.KEYCODE_DEL, 0);
    sendKey.invoke(utils.getController(), KeyEvent.KEYCODE_BUTTON_THUMBL, 0);
    sendKey.invoke(utils.getController(), KeyEvent.KEYCODE_DEL, 0);

    return currText.equals(el.getText());
  }
}
