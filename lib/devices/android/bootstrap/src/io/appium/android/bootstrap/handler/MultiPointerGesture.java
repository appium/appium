package io.appium.android.bootstrap.handler;

import android.os.Build;

import android.view.MotionEvent.PointerCoords;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiScrollable;
import com.android.uiautomator.core.UiSelector;

import org.json.JSONException;
import org.json.JSONArray;
import org.json.JSONObject;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.Logger;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import java.lang.reflect.Method;


public class MultiPointerGesture extends TouchableEvent {

  @Override
  public AndroidCommandResult execute(final AndroidCommand command)
      throws JSONException {
    try {
      PointerCoords[][] pcs = parsePointerCoords(command);

      if (command.isElementCommand()) {
        final AndroidElement el = command.getElement();
        if (el.performMultiPointerGesture(pcs)) {
          return getSuccessResult("OK");
        } else {
          return getErrorResult("Unable to perform multi pointer gesture");
        }
      } else {
        Object controller = getController();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
          final Method pmpg = getMethod("performMultiPointerGesture", controller);
          Boolean rt = (Boolean)pmpg.invoke(controller, (Object)pcs);
          if (rt.booleanValue()) {
            return getSuccessResult("OK");
          } else {
            return getErrorResult("Unable to perform multi pointer gesture");
          }
        } else {
          Logger.error("Device does not support API < 18!");
          return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR,
              "Cannot perform multi pointer gesture on device below API level 18");
        }
      }
    } catch (final ElementNotInHashException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    } catch (final Exception e) {
      Logger.debug("Exception: " + e);
      e.printStackTrace();
      return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, e.getMessage());
    }
  }

  private PointerCoords[][] parsePointerCoords(AndroidCommand command)
      throws JSONException {
    JSONArray actions = (org.json.JSONArray)command.params().get("actions");

    double time = computeLongestTime(actions);

    PointerCoords[][] pcs = new PointerCoords[actions.length()][];
    for (int i = 0; i < actions.length(); i++) {
      JSONArray gestures = actions.getJSONArray(i);

      pcs[i] = gesturesToPointerCoords(time, gestures);
    }

    return pcs;
  }

  private PointerCoords[] gesturesToPointerCoords(double maxTime, JSONArray gestures)
      throws JSONException {
    // gestures, e.g.:
    //    [
    //      {"touch":{"y":529.5,"x":120},"time":0.2},
    //      {"touch":{"y":529.5,"x":130},"time":0.4},
    //      {"touch":{"y":454.5,"x":140},"time":0.6},
    //      {"touch":{"y":304.5,"x":150},"time":0.8}
    //    ]


    // From the docs:
    // "Steps are injected about 5 milliseconds apart, so 100 steps may take
    // around 0.5 seconds to complete."
    int steps = (int)(maxTime * 200) + 2;

    PointerCoords[] pc = new PointerCoords[steps];

    int i = 1;
    JSONObject current = gestures.getJSONObject(0);
    double currentTime = current.getDouble("time");
    double runningTime = 0.0;
    int gesturesLength = gestures.length();
    for (int j = 0; j < steps; j++) {
      if (runningTime > currentTime && i < gesturesLength) {
        current = gestures.getJSONObject(i++);
        currentTime = current.getDouble("time");
      }

      pc[j] = createPointerCoords(current);

      runningTime += 0.005;
    }

    return pc;
  }

  private PointerCoords createPointerCoords(JSONObject obj) throws JSONException {
    JSONObject o = obj.getJSONObject("touch");

    int x = o.getInt("x");
    int y = o.getInt("y");

    PointerCoords p = new PointerCoords();
    p.size = 1;
    p.pressure = 1;
    p.x = x;
    p.y = y;

    return p;
  }

  private double computeLongestTime(JSONArray actions) throws JSONException {
    double max = 0.0;
    for (int i = 0; i < actions.length(); i++) {
      JSONArray gestures = actions.getJSONArray(i);
      double endTime = gestures.getJSONObject(gestures.length()-1).getDouble("time");
      if (endTime > max) {
        max = endTime;
      }
    }

    return max;
  }
}
