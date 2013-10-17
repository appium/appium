package io.appium.android.bootstrap.handler;

import com.android.uiautomator.core.UiObjectNotFoundException;
import io.appium.android.bootstrap.*;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;
import org.json.JSONException;

/**
 * This handler is used to long click elements in the Android UI.
 *
 */
public class TouchLongClick extends CommandHandler {

  /**
   *
   * @param command The {@link AndroidCommand}
   * @return {@link AndroidCommandResult}
   * @throws JSONException
   * @see io.appium.android.bootstrap.CommandHandler#execute(io.appium.android.bootstrap.AndroidCommand)
   */
  @Override
  public AndroidCommandResult execute(AndroidCommand command) throws JSONException {
    if (!command.isElementCommand()) {
      return getErrorResult("Unable to long click without an element.");
    }

    try {
      final AndroidElement el = command.getElement();
      final boolean res = el.longClick();
      return getSuccessResult(res);

    } catch (final UiObjectNotFoundException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final ElementNotInHashException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final Exception e) {
      return getErrorResult(e.getMessage());
    }
  }
}
