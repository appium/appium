package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import org.json.JSONException;

import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to get the text of elements that support it.
 * 
 */
public class GetName extends CommandHandler {

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
    if (!command.isElementCommand()) {
      return getErrorResult("Unable to get name without an element.");
    }

    try {
      final AndroidElement el = command.getElement();
      return getSuccessResult(el.getContentDesc());
    } catch (final UiObjectNotFoundException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final ElementNotInHashException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    }
  }
}
