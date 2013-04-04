package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import java.util.ArrayList;
import java.util.Hashtable;

import org.json.JSONException;

import com.android.uiautomator.core.UiDevice;
import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to click elements in the Android UI.
 * 
 * Based on the element Id, click that element.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * 
 */
public class Click extends CommandHandler {

  /*
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
        final boolean res = el.click();
        return getSuccessResult(res);
      } catch (final UiObjectNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final ElementNotInHashException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      }
    } else {
      final Hashtable<String, Object> params = command.params();
      final Double[] coords = { Double.parseDouble(params.get("x").toString()),
          Double.parseDouble(params.get("y").toString()) };
      final ArrayList<Integer> posVals = absPosFromCoords(coords);
      final boolean res = UiDevice.getInstance().click(posVals.get(0),
          posVals.get(1));
      return getSuccessResult(res);
    }
  }
}
