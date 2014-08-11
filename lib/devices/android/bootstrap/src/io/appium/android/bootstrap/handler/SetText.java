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
        String text = params.get("text").toString();
        Boolean pressEnter = false;
        if (text.endsWith("\\n")) {
          pressEnter = true;
          text = text.replace("\\n", "");
          Logger.debug("Will press enter after setting text");
        }
        String currText = el.getText();
        el.clearText();
        if (!el.getText().isEmpty()) {
          return getErrorResult("clearText not successful, aborting setText");
        }
        final Boolean result = el.setText(currText + text);
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
