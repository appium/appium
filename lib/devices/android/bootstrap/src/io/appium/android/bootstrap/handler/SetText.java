package io.appium.android.bootstrap.handler;

import com.android.uiautomator.core.UiDevice;
import com.android.uiautomator.core.UiObjectNotFoundException;
import io.appium.android.bootstrap.*;
import org.json.JSONException;

import java.util.Hashtable;

/**
 * This handler is used to set text in elements that support it.
 *
 */
public class SetText extends CommandHandler {

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
    if (command.isElementCommand()) {
      // Only makes sense on an element
      try {
        final Hashtable<String, Object> params = command.params();
        final AndroidElement el = command.getElement();
        boolean replace = Boolean.parseBoolean(params.get("replace").toString());
        String text = params.get("text").toString();
        boolean pressEnter = false;
        if (text.endsWith("\\n")) {
          pressEnter = true;
          text = text.replace("\\n", "");
          Logger.debug("Will press enter after setting text");
        }
        boolean unicodeKeyboard = false;
        if (params.get("unicodeKeyboard") != null) {
          unicodeKeyboard = Boolean.parseBoolean(params.get("unicodeKeyboard").toString());
        }
        String currText = el.getText();
        new Clear().execute(command);
        if (!el.getText().isEmpty()) {
          // clear could have failed, or we could have a hint in the field
          // we'll assume it is the latter
          Logger.debug("Text not cleared. Assuming remainder is hint text.");
          currText = "";
        }
        if (!replace) {
          text = currText + text;
        }
        final boolean result = el.setText(text, unicodeKeyboard);
        if (pressEnter) {
          final UiDevice d = UiDevice.getInstance();
          d.pressEnter();
        }
        return getSuccessResult(result);
      } catch (final UiObjectNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final Exception e) { // handle NullPointerException
        return getErrorResult("Unknown error");
      }
    } else {
      return getErrorResult("Unable to set text without an element.");
    }
  }
}
