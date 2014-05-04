package io.appium.android.bootstrap.handler;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiScrollable;
import com.android.uiautomator.core.UiSelector;

import org.json.JSONException;

import java.util.Hashtable;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

/**
 * This handler is used to scroll to elements in the Android UI.
 * 
 * Based on the element Id of the scrollable, scroll to the object with the
 * text.
 * 
 */
public class ScrollTo extends CommandHandler {

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
    if (!command.isElementCommand()) {
      return getErrorResult("A scrollable view is required for this command.");
    }

    try {
      Boolean result;
      final Hashtable<String, Object> params = command.params();
      final String text = params.get("text").toString();
      final String direction = params.get("direction").toString();

      final AndroidElement el = command.getElement();

      if (!el.getUiObject().isScrollable()) {
        return getErrorResult("The provided view is not scrollable.");
      }

      final UiScrollable view = new UiScrollable(el.getUiObject().getSelector());

      if (direction.toLowerCase().contentEquals("horizontal")
          || view.getClassName().contentEquals(
              "android.widget.HorizontalScrollView")) {
        view.setAsHorizontalList();
      }
      view.scrollToBeginning(100);
      view.setMaxSearchSwipes(100);
      result = view.scrollTextIntoView(text);
      view.waitForExists(5000);

      // make sure we can get to the item
      UiObject listViewItem = view.getChildByInstance(
          new UiSelector().text(text), 0);

      // We need to make sure that the item exists (visible)
      if (!(result && listViewItem.exists())) {
        return getErrorResult("Could not scroll element into view: " + text);
      }
      return getSuccessResult(result);
    } catch (final UiObjectNotFoundException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final ElementNotInHashException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final NullPointerException e) { // el is null
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final Exception e) {
      return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, e.getMessage());
    }
  }
}
