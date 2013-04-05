package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;

import java.util.Hashtable;

import org.json.JSONException;

import com.android.uiautomator.core.UiDevice;

/**
 * This handler is used to flick elements in the Android UI.
 * 
 * Based on the element Id, flick that element.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * 
 */
public class Flick extends CommandHandler {

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
      final Hashtable<String, Object> params = command.params();
      final Integer xSpeed = (Integer) params.get("xSpeed");
      final Integer ySpeed = (Integer) params.get("ySpeed");

      final UiDevice d = UiDevice.getInstance();

      final Integer screenX = d.getDisplayWidth();
      final Integer screenY = d.getDisplayHeight();
      final Integer startX = screenX / 2;
      final Integer startY = screenY / 2;
      final Double speedRatio = (double) xSpeed / ySpeed;
      Integer xOff;
      Integer yOff;

      if (speedRatio < 1) {
        yOff = screenY / 4;
        xOff = (int) ((double) screenX / 4 * speedRatio);
      } else {
        xOff = screenX / 4;
        yOff = (int) ((double) screenY / 4 / speedRatio);
      }

      final Integer endX = startX + Integer.signum(xSpeed) * xOff;
      final Integer endY = startY + Integer.signum(ySpeed) * yOff;
      final Double speed = Math.max(1250,
          Math.sqrt(xSpeed * xSpeed + ySpeed * ySpeed));
      final Integer steps = 1250 / speed.intValue() + 1;

      final boolean res = d.swipe(startX, startY, endX, endY, steps);

      if (res) {
        return getSuccessResult(res);
      } else {
        return getErrorResult("Flick did not complete successfully");
      }
    } else {
      return getErrorResult("Flick not yet implemented on the element level.");
    }
  }
}
