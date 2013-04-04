package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import java.util.Hashtable;

import org.json.JSONException;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to set text in elements that support it.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
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
        final String text = params.get("text").toString();

        return getSuccessResult(el.setText(text));
      } catch (final UiObjectNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final ElementNotInHashException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      }
    } else {
      return getErrorResult("Unable to set text without an element.");
    }
  }
}
